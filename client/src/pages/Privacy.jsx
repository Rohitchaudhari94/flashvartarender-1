export default function Privacy() {
  const currentYear = new Date().getFullYear();

  return (
    <article className="info-page">
      <header className="info-header">
        <p className="date-line">Legal &middot; FlashVarta</p>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="info-lead">
          Last updated: {currentYear}. Your privacy and data security are fundamental to how FlashVarta operates.
        </p>
      </header>

      <div className="info-card info-prose">
        <h2>1. Information We Collect</h2>
        <p>
          FlashVarta collects basic account details when you voluntarily register, including your name, email address,
          and encrypted authentication credentials. We do not sell, rent, or monetize your personal data.
        </p>

        <h2>2. How We Use Information</h2>
        <p>
          We use your information exclusively to provide a personalized reading experience, maintain user sessions,
          authenticate administrative access, and deliver platform updates.
        </p>

        <h2>3. Data Protection &amp; Passwords</h2>
        <p>
          All passwords are encrypted using industry-standard bcrypt hashing algorithms before storage. We utilize
          secure JSON Web Tokens (JWT) for session management and implement strict rate limiting to defend against
          brute-force attacks.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>
          External headlines may be aggregated via authorized APIs such as NewsData.io. When navigating to third-party
          external publisher sites, their respective privacy policies apply.
        </p>

        <h2>5. Your Rights &amp; Contact</h2>
        <p>
          You have the right to request deletion or modification of your account information. For inquiries, email us at{' '}
          <a href="mailto:contact@flashvarta.com" className="link-text">
            contact@flashvarta.com
          </a>.
        </p>
      </div>
    </article>
  );
}
