// Thin wrapper around the NewsData.io "latest" endpoint with an in-memory cache.
// The free plan has a small daily credit limit, so identical requests are served
// from cache for 10 minutes (and from stale cache if the API errors out).
const BASE_URL = 'https://newsdata.io/api/1/latest';
const TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const cache = new Map();

function toDate(value) {
  if (!value) return null;
  // NewsData returns "YYYY-MM-DD HH:mm:ss" in UTC
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalize(a) {
  const category = Array.isArray(a.category) ? a.category[0] : a.category;
  return {
    id: a.article_id,
    origin: 'api',
    title: a.title,
    description: a.description || '',
    imageUrl: a.image_url || '',
    url: a.link,
    source: a.source_name || a.source_id || 'News',
    category: category || 'top',
    publishedAt: toDate(a.pubDate),
  };
}

async function fetchNews({ category, q, page, country = 'in', language = 'en' } = {}) {
  const key = JSON.stringify([category, q, page, country, language]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  if (!process.env.NEWSDATA_API_KEY) throw new Error('NEWSDATA_API_KEY is not set in server/.env');

  const params = new URLSearchParams({ apikey: process.env.NEWSDATA_API_KEY, language });
  if (country) params.set('country', country);
  if (category && category !== 'all') params.set('category', category);
  if (q) params.set('q', q);
  if (page) params.set('page', page);

  try {
    const res = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(12000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 'success') {
      const msg = json?.results?.message || json?.message || `NewsData.io returned ${res.status}`;
      throw new Error(msg);
    }
    const data = {
      articles: (json.results || []).filter((a) => a.title && a.link).map(normalize),
      nextPage: json.nextPage || null,
    };
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return { ...hit.data, stale: true };
    throw err;
  }
}

module.exports = { fetchNews };
