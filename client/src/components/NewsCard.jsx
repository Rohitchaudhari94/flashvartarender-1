import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bolt } from './Logo.jsx';
import { timeAgo } from '../utils.js';

export default function NewsCard({ item, featured = false }) {
  const [broken, setBroken] = useState(false);
  const isAd = Boolean(item.isSponsored || item.type === 'ad');
  const className = `card${featured ? ' card-featured' : ''}${isAd ? ' card-ad' : ''}`;

  const inner = (
    <>
      <div className="card-media">
        {item.imageUrl && !broken ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="card-ph">
            <Bolt size={featured ? 56 : 36} />
          </div>
        )}
        <span className="chip">{item.category}</span>
        {isAd && <span className="ad-badge-corner">Sponsored</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{item.title}</h3>
        {item.description && <p className="card-desc">{item.description}</p>}
        <div className="card-meta">
          <span className="src">{item.source}</span>
          {isAd ? (
            <span className="badge badge-ad">Sponsored Ad</span>
          ) : item.submission ? (
            <span className="badge badge-community">Community</span>
          ) : item.origin === 'admin' ? (
            <span className="badge">Original</span>
          ) : null}
          <span className="when">{timeAgo(item.publishedAt)}</span>
        </div>
        {isAd && item.targetUrl && (
          <div className="ad-action-row">
            <span className="ad-cta-link">
              Visit Sponsor Link &rarr;
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (item.origin === 'admin') {
    return (
      <Link to={`/news/${item.id}`} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={item.url || item.targetUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  );
}
