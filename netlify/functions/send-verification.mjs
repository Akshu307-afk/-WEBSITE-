import { randomInt } from "node:crypto";
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!/^[a-z0-9]+(?:[.+][a-z0-9]+)*@gmail\.com$/.test(email)) {
    return json({ error: "Enter a correctly formatted Gmail address." }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VERIFICATION_FROM_EMAIL;
  if (!apiKey || !from) {
    return json({ error: "Email verification is not configured yet. The site owner needs to finish the email-service setup." }, 503);
  }

  const store = getStore("portfolio-email-verification");
  const rateKey = "send-limit:" + email;
  const prior = await store.get(rateKey, { type: "json" });
  if (prior && prior.nextAllowedAt > Date.now()) {
    return json({ error: "A code was sent recently. Please wait a minute before requesting another." }, 429);
  }

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await store.setJSON("code:" + email, { code, expiresAt, attempts: 0 });
  await store.setJSON(rateKey, { nextAllowedAt: Date.now() + 60 * 1000 });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your portfolio email verification code",
      text: "Your verification code is " + code + ". It expires in 10 minutes. If you did not request this, you can ignore this email."
    })
  });

  if (!response.ok) {
    await store.delete("code:" + email);
    const detail = await response.text();
    console.error("Email provider error:", response.status, detail.slice(0, 300));
    return json({ error: "The email provider could not send the code. Please try again later." }, 502);
  }
  return json({ ok: true, message: "Code sent. Check your inbox and spam folder." });
};
