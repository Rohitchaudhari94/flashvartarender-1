export default function Terms() {
  const currentYear = new Date().getFullYear();

  return (
    <article className="info-page">
      <header className="info-header">
        <p className="date-line">Terms of Service &middot; FlashVarta</p>
        <h1 className="page-title">Terms &amp; Conditions</h1>
        <p className="info-lead">
          Effective as of {currentYear}. By accessing FlashVarta, you agree to comply with these terms.
        </p>
      </header>

      <div className="info-card info-prose">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or reading stories on FlashVarta, you agree to be bound by these Terms and Conditions
          and all applicable laws and regulations.
        </p>

        <h2>2. Editorial Content &amp; Intellectual Property</h2>
        <p>
          Original news content published under the FlashVarta byline is owned by FlashVarta and creator Rohit Chaudhari.
          Syndicated headlines belong to their respective original publishers and copyright holders.
        </p>

        <h2>3. Acceptable Use</h2>
        <p>
          Users must not attempt unauthorized access to administrative functions, manipulate platform APIs, interfere
          with system operations, or submit unlawful, malicious, or abusive content.
        </p>

        <h2>4. Account Termination &amp; Suspension</h2>
        <p>
          FlashVarta reserves the right to suspend, deactivate, or delete accounts that violate security policies or
          disrupt the service.
        </p>

        <h2>5. Changes to Terms</h2>
        <p>
          We may update these terms periodically. Continued use of FlashVarta constitutes acceptance of modified terms.
          For questions, contact <a href="mailto:contact@flashvarta.com" className="link-text">contact@flashvarta.com</a>.
        </p>
      </div>
    </article>
  );
}
