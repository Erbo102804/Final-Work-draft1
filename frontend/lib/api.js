"use client";

const ACCESS_KEY = "foundex_access";
const REFRESH_KEY = "foundex_refresh";

export class ApiError extends Error {
  constructor(status, data) {
    super(extractMessage(data) || `Ошибка запроса (${status})`);
    this.status = status;
    this.data = data;
  }
}

export function extractMessage(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(extractMessage).join(" ");
  if (data.detail) return extractMessage(data.detail);
  return Object.entries(data)
    .map(([key, value]) => (key === "non_field_errors" ? extractMessage(value) : `${key}: ${extractMessage(value)}`))
    .join(" ");
}

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getTokens() {
  const s = storage();
  return { access: s?.getItem(ACCESS_KEY), refresh: s?.getItem(REFRESH_KEY) };
}

export function setTokens({ access, refresh }) {
  const s = storage();
  if (!s) return;
  if (access) s.setItem(ACCESS_KEY, access);
  if (refresh) s.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  const s = storage();
  s?.removeItem(ACCESS_KEY);
  s?.removeItem(REFRESH_KEY);
}

async function refreshAccess() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  setTokens(await res.json());
  return true;
}

function buildUrl(path, params) {
  // Next.js rewrites add the trailing slash Django expects.
  const clean = path.replace(/\/+$/, "").replace(/\/\?/, "?");
  const url = `/api${clean.startsWith("/") ? clean : `/${clean}`}`;
  if (!params) return url;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, Array.isArray(value) ? value.join(",") : value);
  });
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function api(path, { method = "GET", body, params, retry = true } = {}) {
  const { access } = getTokens();
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && access) {
    if (await refreshAccess()) return api(path, { method, body, params, retry: false });
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export function formatMoney(value) {
  if (!value) return "—";
  return `$${Number(value).toLocaleString("ru-RU")}`;
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const loom = url.match(/loom\.com\/share\/(\w+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
