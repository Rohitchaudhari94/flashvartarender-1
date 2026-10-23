import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { timeAgo } from '../utils.js';

export default function Article() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setError('');
    api
      .get(`/news/${id}`)
      .then((d) => !cancelled && setArticle(d.article))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="empty">
        <h3>{error}</h3>
        <Link className="btn btn-outline" to="/news">
          Back to news
        </Link>
      </div>
    );
  }
  if (!article) {
    return (
      <div className="center-block">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  const isAd = Boolean(article.isSponsored || article.type === 'ad');
  const paragraphs = (article.content || '').split(/\n{2,}/).filter((p) => p.trim());

  return (
    <article className="article">
      <Link to="/news" className="back">
        &larr; Back to news
      </Link>
      <div className="article-tag-row">
        <span className="chip chip-inline">{article.category}</span>
        {isAd && <span className="badge badge-ad">Sponsored Advertisement</span>}
      </div>
      <h1 className="article-title">{article.title}</h1>
      <div className="article-meta">
        <span>{article.source}</span>
        <span>&middot;</span>
        <span>{timeAgo(article.publishedAt)}</span>
        {isAd && article.targetUrl && (
          <>
            <span>&middot;</span>
            <a
              href={article.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="article-sponsor-link"
            >
              Visit Advertiser Website &rarr;
            </a>
          </>
        )}
      </div>
      {article.imageUrl && (
        <img className="article-img" src={article.imageUrl} alt="" referrerPolicy="no-referrer" />
      )}
      <p className="article-lead">{article.description}</p>
      {paragraphs.map((p, i) => (
        <p key={i} className="article-p">
          {p}
        </p>
      ))}

      {isAd && article.targetUrl && (
        <div className="article-ad-footer-box">
          <div className="ad-footer-content">
            <h4>Interested in this offering?</h4>
            <p>Visit the official sponsor website to learn more or get in touch directly.</p>
          </div>
          <a
            href={article.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Visit Website &rarr;
          </a>
        </div>
      )}
    </article>
  );
}
