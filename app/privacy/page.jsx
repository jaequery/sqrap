export const metadata = {
  title: "Privacy policy — Sqrap",
  description: "What Sqrap stores about you (your email, saved designs, API keys), what Google sign-in shares, and how to delete your account. We never sell your data or use it for ads or training.",
};

// Privacy policy for people with a Sqrap account, Google sign-in included.
// Keep it in step with what the code stores: lib/auth.js, app/api/auth/*,
// likes, API keys, lib/agent-quota.js, app/api/clicks and app/api/removal.
export default function Privacy() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/#/apps" aria-label="Sqrap home">
          <svg viewBox="0 0 46 46" aria-hidden="true">
            <circle cx="23" cy="23" r="20.5" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M28.5 16.5c-1.2-1.6-3.2-2.5-5.5-2.5-3.1 0-5.5 1.9-5.5 4.4 0 5.6 11.5 3.5 11.5 9.3 0 2.6-2.6 4.8-6 4.8-2.5 0-4.6-1-5.8-2.8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="wordmark" aria-hidden="true">Sqrap</span>
        </a>
      </header>

      <main className="main">
        <a className="back" href="/#/apps">← All sites</a>
        <article className="doc">
          <h1>Privacy policy</h1>
          <p className="doc-lede">Sqrap keeps as little about you as it can. You can browse the whole library without an account; this page covers what we store when you create one, sign in with Google, save designs or use API keys.</p>

          <h2>What we collect</h2>
          <p><b>Your account.</b> Your email address and, if you sign up with a password, a scrypt hash of that password. We never store the password itself.</p>
          <p><b>Google sign-in.</b> When you continue with Google we ask only for the <code>openid</code>, <code>email</code> and <code>profile</code> scopes. Google tells us your account id, your email address, whether Google has verified it, and your name. We keep those to link the Google account to your Sqrap account. We get no access to your Gmail, contacts, Drive, calendar or any other Google data, and we keep no Google access token after sign-in.</p>
          <p><b>Sessions.</b> Signing in sets one cookie, <code>sqrap_session</code>, that keeps you signed in for up to 30 days. We store only a SHA-256 hash of it. During Google sign-in a second short-lived cookie (ten minutes) protects the hand-off with Google; it is deleted when you come back.</p>
          <p><b>Saved designs.</b> The sites and pages you save to your Liked view.</p>
          <p><b>API keys.</b> The name you give each key, its first characters and a hash of it, never the full key. For each key we count calls per day to apply its usage limit, and we count calls per endpoint each week to see how the API is used.</p>
          <p><b>Removal requests.</b> If you ask us to remove a site, the domain, the email you give and your reason, so we can reach you about it.</p>
          <p><b>Usage of the library.</b> Which sites, filters and buttons are clicked, so we can improve the library. These records hold no account, name, email or address.</p>
          <p><b>Your network address.</b> We read your IP address to limit repeated sign-in attempts and abuse. It is held briefly in server memory for that and is not stored in our database.</p>
          <p>We use no advertising or third-party analytics trackers, and no cookies besides the ones above.</p>

          <h2>What we do not do</h2>
          <p>We do not sell, rent or share your personal data, and we do not use it for advertising or to train machine-learning models. We use it only to run Sqrap: to sign you in, keep your saved designs and keys, and keep the service safe.</p>
          <p>Sqrap's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements. Google user data is used only to sign you in, is never transferred to others except as needed to run the service or required by law, and is never read by people except with your consent, for security, or as required by law.</p>

          <h2>Where it lives</h2>
          <p>Sqrap is hosted on Vercel. Accounts, saved designs, keys and removal requests are stored in a Neon Postgres database; API usage counters are kept in Redis (Upstash) and expire on their own. These providers process the data on our behalf only.</p>

          <h2>Deleting your data</h2>
          <p>Sign out any time to end your session, and revoke API keys in the API keys dialog. To delete your account and everything tied to it (sessions, linked Google sign-in, saved designs and keys), email <a href="mailto:jaequery@gmail.com">jaequery@gmail.com</a> from the address on the account. You can also remove Sqrap's access in your Google account's security settings.</p>

          <h2>Captured websites</h2>
          <p>The screenshots on Sqrap are captured from public websites that allow it in their robots.txt, and every one links to its source. Site owners can have their site taken down with <b>Request removal</b> in the About dialog on <a href="/#/apps">sqrap.com</a>; it is hidden at once and never captured again. Scripts and agents are covered by the <a href="/terms">terms for agents and API use</a>.</p>

          <h2>Changes and contact</h2>
          <p>If this policy changes, the version on this page is the one that applies. Questions about your data go to <a href="mailto:jaequery@gmail.com">jaequery@gmail.com</a>.</p>
        </article>
      </main>
    </>
  );
}
