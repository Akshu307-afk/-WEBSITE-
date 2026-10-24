import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  let email = "";
  let code = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
    code = String(body.code || "").trim();
  } catch {
    return json({ error: "Enter the email and six-digit code." }, 400);
  }
  if (!/^[a-z0-9]+(?:[.+][a-z0-9]+)*@gmail\.com$/.test(email) || !/^\d{6}$/.test(code)) {
    return json({ error: "Enter a Gmail address and the six-digit code." }, 400);
  }

  const store = getStore("portfolio-email-verification");
  const record = await store.get("code:" + email, { type: "json" });
  if (!record || record.expiresAt < Date.now()) {
    await store.delete("code:" + email);
    return json({ error: "That code has expired. Request a new one." }, 400);
  }
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    await store.delete("code:" + email);
    return json({ error: "Too many attempts. Request a new code." }, 429);
  }
  if (record.code !== code) {
    await store.setJSON("code:" + email, record);
    return json({ error: "That code does not match. Check it and try again." }, 400);
  }

  await store.setJSON("verified:" + email, { verifiedAt: Date.now(), expiresAt: Date.now() + 20 * 60 * 1000 });
  await store.delete("code:" + email);
  return json({ ok: true, message: "Email inbox verified.", email });
};
