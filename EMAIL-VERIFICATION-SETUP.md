# Email verification setup

The website now has server-side functions for sending a one-time Gmail verification code, checking that code, and delivering a verified message privately to the site owner.

## Required setup in Netlify

1. Use a sender email address on a domain you control. The free `netlify.app` address is a website address, not an email domain.
2. Create an account with an email API provider such as Resend and verify your sending domain in that provider. Follow its domain/DNS instructions; do not skip verification.
3. In Netlify, open your site project, then **Project configuration → Environment variables**.
4. Add these variables (keep all values private):
   - `RESEND_API_KEY` — your provider API key.
   - `VERIFICATION_FROM_EMAIL` — the sender identity the provider has approved, for example `Portfolio <verify@your-domain.example>` (replace with your actual verified domain).
   - `CONTACT_EMAIL` — the inbox where you want to receive portfolio messages.
5. Save the variables and trigger a fresh deploy. Netlify documents that function environment-variable changes apply after a new deploy.
6. Test with your own Gmail address first: request a code, check inbox/spam, verify it, and submit a test message.

## Important

- Never put API keys in HTML, JavaScript, GitHub, or a chat message. Add them only to Netlify environment variables.
- The code expires after 10 minutes. A code request is rate-limited per email for one minute, and verification allows up to five attempts.
- Verified messages are sent privately to the configured contact inbox; the form does not publish messages on the website.
- If the email provider or environment variables are not configured, the form will show a setup error instead of pretending verification succeeded.
