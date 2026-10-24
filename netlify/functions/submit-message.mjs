import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please check the form and try again." }, 400); }

  if (String(body.botField || "").trim()) return json({ error: "Submission rejected." }, 400);

  const name = String(body.name || "").trim().slice(0, 60);
  const email = String(body.email || "").trim().toLowerCase();
  const kind = String(body.kind || "").trim().slice(0, 60);
  const rating = String(body.rating || "").trim().slice(0, 40);
  const message = String(body.message || "").trim().slice(0, 1500);
  if (!name || !message || !["Website review", "Suggestion", "Just saying hello", "Project idea"].includes(kind)) {
    return json({ error: "Please complete the required fields." }, 400);
  }
  if (!/^[a-z0-9]+(?:[.+][a-z0-9]+)*@gmail\.com$/.test(email)) {
    return json({ error: "Please enter a correctly formatted Gmail address." }, 400);
  }

  const store = getStore("portfolio-email-verification");
  const verified = await store.get("verified:" + email, { type: "json" });
  if (!verified || verified.expiresAt < Date.now()) {
    await store.delete("verified:" + email);
    return json({ error: "Please verify your Gmail inbox again before sending." }, 403);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VERIFICATION_FROM_EMAIL;
  const recipient = process.env.CONTACT_EMAIL;
  if (!apiKey || !from || !recipient) {
    return json({ error: "Message delivery is not configured yet. The site owner needs to finish the email setup." }, 503);
  }

  const safe = (value) => value.replace(/[<>]/g, "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: email,
      subject: "[Portfolio] " + safe(kind) + " from " + safe(name),
      text: "New private portfolio message\n\nName: " + name + "\nEmail: " + email + "\nType: " + kind + "\nRating: " + (rating || "Not provided") + "\n\nMessage:\n" + message
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Message delivery failed:", response.status, detail.slice(0, 300));
    return json({ error: "The message could not be delivered. Please try again later." }, 502);
  }

  await store.delete("verified:" + email);
  return json({ ok: true, message: "Your message has been sent." });
};
