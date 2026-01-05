export async function payloadHash(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getOrReuseKey(payload) {
  const h = await payloadHash(payload);
  const existing = localStorage.getItem(`idem:${h}`);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  localStorage.setItem(`idem:${h}`, fresh);
  return fresh;
}
