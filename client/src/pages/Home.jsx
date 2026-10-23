import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import NewsCard from '../components/NewsCard.jsx';
import { FEED_CATEGORIES, greeting } from '../utils.js';

export default function Home() {
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const buildUrl = useCallback(
    (page) => {
      const p = new URLSearchParams();
      p.set('category', category);
      if (query) p.set('q', query);
      if (page) p.set('page', page);
      return `/news?${p}`;
    },
    [category, query]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(buildUrl())
      .then((d) => {
        if (cancelled) return;
        setItems(d.articles);
        setNextPage(d.nextPage);
        setNotice(d.externalError || '');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setItems([]);
        setNextPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildUrl]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await api.get(buildUrl(nextPage));
      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.origin}-${i.id}`));
        return [...prev, ...d.articles.filter((i) => !seen.has(`${i.origin}-${i.id}`))];
      });
      setNextPage(d.nextPage);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setQuery(q.trim());
  };

  const clearSearch = () => {
    setQ('');
    setQuery('');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <section className="masthead">
        <div>
          <p className="date-line">{today}</p>
          <h1 className="page-title">
            {user?.name ? `${greeting()}, ${user.name.split(' ')[0]}.` : "Today's Headlines"}
          </h1>
        </div>
        <form className="search" onSubmit={submitSearch} role="search">
          <input
            className="input"
            type="search"
            placeholder="Search headlines"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search headlines"
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </section>

      {/* Community Promotion & News Share Banner */}
      <div className="home-share-banner">
        <div className="share-banner-content">
          <div className="share-banner-badge">
            <span className="live-dot" /> ₹49 Publishing Fee
          </div>
          <p className="share-banner-text">
            <strong>Share Breaking News or Promote Your Brand</strong> &bull; Reach readers across Maharashtra &amp; India. Verified &amp; published by our editorial desk.
          </p>
        </div>
        <div className="share-banner-actions">
          <Link to="/share-news" className="btn btn-primary btn-sm">
            Post Story (₹49) &rarr;
          </Link>
          <Link to="/share-news?type=ad" className="btn btn-outline btn-sm">
            Advertise (₹49)
          </Link>
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Categories">
        {FEED_CATEGORIES.map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={category === value}
            className={category === value ? 'pill active' : 'pill'}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {query && (
        <p className="search-note">
          Results for <strong>&ldquo;{query}&rdquo;</strong>{' '}
          <button className="link-btn" onClick={clearSearch}>
            Clear
          </button>
        </p>
      )}

      {notice && <div className="alert alert-warn">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card skeleton">
              <div className="card-media" />
              <div className="card-body">
                <div className="sk-line" />
                <div className="sk-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="empty">
          <h3>No stories found</h3>
          <p>Try a different category or search term.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {items.map((item, i) => (
              <NewsCard key={`${item.origin}-${item.id}`} item={item} featured={i === 0 && !query} />
            ))}
          </div>
          {nextPage && (
            <div className="load-more">
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more stories'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
