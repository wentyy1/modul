// server.js
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// ===== stores =====
const idemStore = new Map(); // Idempotency-Key -> {status, body}
const rate = new Map();      // ip -> {count, ts}

// ===== config =====
const WINDOW_MS = 10_000;
const MAX_REQ = 8;
const now = () => Date.now();

// ===== helper: unified error =====
function errBody({ error, code = null, details = null, requestId }) {
  return { error, code, details, requestId };
}

// ===== X-Request-Id middleware =====
app.use((req, res, next) => {
  const rid = req.get("X-Request-Id") || randomUUID();
  req.rid = rid;
  res.setHeader("X-Request-Id", rid);
  next();
});

// ===== rate-limit + Retry-After =====
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
  const b = rate.get(ip) ?? { count: 0, ts: now() };

  const within = now() - b.ts < WINDOW_MS;
  const state = within ? { count: b.count + 1, ts: b.ts } : { count: 1, ts: now() };
  rate.set(ip, state);

  if (state.count > MAX_REQ) {
    res.setHeader("Retry-After", "2");
    return res.status(429).json(errBody({ error: "too_many_requests", requestId: req.rid }));
  }
  next();
});

// ===== fault/latency injection (для демонстрації ретраїв/таймаутів) =====
app.use(async (req, res, next) => {
  const r = Math.random();

  // 15% — повільна відповідь (1.2–2.0s)
  if (r < 0.15) {
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));
  }

  // 20% — 5xx
  if (r > 0.80) {
    const kind = Math.random() < 0.5 ? "unavailable" : "unexpected";
    const status = kind === "unavailable" ? 503 : 500;
    return res.status(status).json(errBody({ error: kind, requestId: req.rid }));
  }

  next();
});

// ===== in-memory products =====
const products = new Map(); // id -> product
function validateProductCreate(body) {
  const details = [];
  if (!body?.name) details.push({ field: "name", message: "Name is required" });
  if (!body?.type) details.push({ field: "type", message: "Type is required" });
  if (!body?.brand) details.push({ field: "brand", message: "Brand is required" });
  if (body?.price == null) details.push({ field: "price", message: "Price is required" });
  if (details.length) return details;
  return null;
}

// ===== idempotent POST /products =====
app.post("/products", (req, res) => {
  const key = req.get("Idempotency-Key");
  if (!key) {
    return res
      .status(400)
      .json(errBody({ error: "validation_error", code: "IDEMPOTENCY_KEY_REQUIRED", details: [{ field: "Idempotency-Key", message: "Header is required" }], requestId: req.rid }));
  }

  // if repeated key → return same result (no duplicate side effects)
  if (idemStore.has(key)) {
    const stored = idemStore.get(key); // {status, body}
    return res.status(stored.status).json({ ...stored.body, requestId: req.rid });
  }

  // validate
  const v = validateProductCreate(req.body);
  if (v) {
    const body = errBody({ error: "validation_error", code: "VALIDATION_FAILED", details: v, requestId: req.rid });
    // Важливо: для ідемпотентності можна теж кешувати помилку, але зазвичай кешують тільки успіх.
    // Тут кешуємо помилку також, щоб повтор тим самим ключем повертав те саме.
    idemStore.set(key, { status: 400, body });
    return res.status(400).json(body);
  }

  const id = "p_" + randomUUID().slice(0, 8);
  const createdAt = new Date().toISOString();
  const product = { id, ...req.body, createdAt, updatedAt: createdAt };

  products.set(id, product);

  const body = { ...product };
  idemStore.set(key, { status: 201, body });

  return res.status(201).json({ ...body, requestId: req.rid });
});

// ===== minimal GET list/details (щоб зручно тестити) =====
app.get("/products", (_req, res) => {
  return res.json(Array.from(products.values()));
});

app.get("/products/:id", (req, res) => {
  const p = products.get(req.params.id);
  if (!p) return res.status(404).json(errBody({ error: "not_found", code: "PRODUCT_NOT_FOUND", requestId: req.rid }));
  return res.json(p);
});

// ===== health =====
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(8081, () => console.log("server :8081"));
