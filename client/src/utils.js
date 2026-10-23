// Categories shown as chips on the news feed
export const FEED_CATEGORIES = [
  ['all', 'All'],
  ['top', 'Top Stories'],
  ['india', 'India'],
  ['maharashtra', 'Maharashtra'],
  ['world', 'World'],
  ['business', 'Business'],
  ['technology', 'Technology'],
  ['sports', 'Sports'],
  ['entertainment', 'Entertainment'],
  ['science', 'Science'],
  ['health', 'Health'],
  ['politics', 'Politics'],
];

// All categories an admin can publish under (matches NewsData.io + the API)
export const ALL_CATEGORIES = [
  'top',
  'india',
  'maharashtra',
  'world',
  'business',
  'technology',
  'sports',
  'entertainment',
  'science',
  'health',
  'politics',
  'education',
  'environment',
  'lifestyle',
  'crime',
  'food',
  'tourism',
  'domestic',
  'other',
];

export function timeAgo(date) {
  if (!date) return '';
  const then = new Date(date);
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
