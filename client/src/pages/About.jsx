import { Link } from 'react-router-dom';
import { FEED_CATEGORIES } from '../utils.js';

export default function About() {
  return (
    <article className="info-page">
      <header className="info-header">
        <p className="date-line">Editorial Overview &middot; FlashVarta</p>
        <h1 className="page-title">About FlashVarta</h1>
        <p className="info-lead">
          Fast, reliable, and accessible digital news designed for the modern reader.
        </p>
      </header>

      {/* 1. About FlashVarta */}
      <section className="info-card">
        <h2 className="info-section-title">About FlashVarta</h2>
        <p>
          FlashVarta is a digital news platform designed to bring readers the latest news, trending stories,
          and important updates from India and around the world. Our goal is to make news accessible through a clean,
          user-friendly, and engaging reading experience.
        </p>
      </section>

      {/* 2. Mission and Purpose */}
      <section className="info-card">
        <h2 className="info-section-title">Our Mission &amp; Purpose</h2>
        <p>
          In an era where information is often cluttered and sensationalized, FlashVarta focuses on delivering
          concise, verified, and timely news. We strive to provide a clutter-free reading environment where readers
          can stay informed without overwhelming ads, paywalls, or sensationalized headlines.
        </p>
        <ul className="info-list">
          <li><strong>Speed &amp; Accessibility:</strong> Breaking headlines delivered pal bhar mein.</li>
          <li><strong>Clarity &amp; Focus:</strong> Clear editorial summaries alongside comprehensive reporting.</li>
          <li><strong>Independence:</strong> Straightforward news coverage focused on public interest.</li>
        </ul>
      </section>

      {/* 3. About the Creator */}
      <section className="info-card">
        <h2 className="info-section-title">About the Creator</h2>
        <p className="author-highlight">
          <strong>Rohit Chaudhari</strong> &mdash; Content Creator &amp; Developer
        </p>
        <p>
          Rohit Chaudhari is a content creator and developer passionate about technology, digital media,
          and building useful web applications. FlashVarta is a project created to deliver a modern and accessible
          news-reading experience.
        </p>
        <div className="creator-social-strip">
          <a
            href="https://www.youtube.com/@marathi_rohit"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            aria-label="YouTube Channel Marathi Rohit (opens in a new tab)"
          >
            ▶ YouTube: Marathi Rohit (@marathi_rohit)
          </a>
          <a
            href="https://instagram.com/rohit.chaudhari_11"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            aria-label="Instagram Profile @rohit.chaudhari_11 (opens in a new tab)"
          >
            📷 Instagram: @rohit.chaudhari_11
          </a>
          <a
            href="https://linkedin.com/in/rohit-chaudhari"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            aria-label="LinkedIn Profile Rohit Chaudhari (opens in a new tab)"
          >
            💼 LinkedIn: Rohit Chaudhari
          </a>
        </div>
      </section>

      {/* 4. Content Categories Covered */}
      <section className="info-card">
        <h2 className="info-section-title">Categories Covered by FlashVarta</h2>
        <p>
          FlashVarta organizes reporting across a wide spectrum of topics to keep readers informed across every domain:
        </p>
        <div className="category-tags-grid">
          {FEED_CATEGORIES.filter(([val]) => val !== 'all').map(([val, label]) => (
            <Link key={val} to={`/news?category=${val}`} className="category-tag-link">
              <span className="cat-bullet">&bull;</span> {label}
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Contact Callout */}
      <section className="info-card info-card-cta">
        <h2 className="info-section-title">Have Questions or Feedback?</h2>
        <p>
          We welcome feedback, suggestions, and tips from our readers. Reach out to Rohit Chaudhari and the
          editorial team directly through our contact page.
        </p>
        <div className="info-action-row">
          <Link to="/contact" className="btn btn-primary">
            Get in Touch / Contact Us &rarr;
          </Link>
          <Link to="/news" className="btn btn-outline">
            Browse Latest Stories
          </Link>
        </div>
      </section>
    </article>
  );
}
