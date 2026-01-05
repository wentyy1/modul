const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const backoff = (base, attempt, jitter) => {
  const b = base * 2 ** attempt;
  const j = jitter ? Math.floor(Math.random() * 100) : 0;
  return b + j;
};

export async function fetchWithResilience(url, opts = {}) {
  const {
    retry = {},
    idempotencyKey,
    requestId,
    timeoutMs = retry.timeoutMs ?? 3000,
    ...init
  } = opts;

  const {
    retries = 2,
    baseDelayMs = 250,
    jitter = true,
  } = retry;

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  headers.set("X-Request-Id", requestId ?? crypto.randomUUID());

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });

    // 429 → wait Retry-After and retry
    if (res.status === 429 && retries >= 1) {
      const ra = Number(res.headers.get("Retry-After") || 1) * 1000;
      await sleep(ra);
      return fetchWithResilience(url, {
        ...opts,
        retry: { ...retry, retries: retries - 1 },
        __a: ((opts.__a ?? 0)),
      });
    }

    // 5xx → retry with backoff
    if ([500, 502, 503, 504].includes(res.status) && retries >= 1) {
      const attempt = opts.__a ?? 0;
      await sleep(backoff(baseDelayMs, attempt, jitter));
      return fetchWithResilience(url, {
        ...opts,
        __a: attempt + 1,
        retry: { ...retry, retries: retries - 1 },
      });
    }

    return res;
  } catch (e) {
    // network / abort → retry
    if (retries >= 1) {
      const attempt = opts.__a ?? 0;
      await sleep(backoff(baseDelayMs, attempt, jitter));
      return fetchWithResilience(url, {
        ...opts,
        __a: attempt + 1,
        retry: { ...retry, retries: retries - 1 },
      });
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
