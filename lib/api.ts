const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
const TOKEN_KEY = "dokandesk_access_token";
const USER_KEY = "dokandesk_user";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export const authStore = {
  getToken: () => typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || "",
  getUser: () => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  },
  set: (token: string, user: unknown) => { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  clear: () => { if (typeof window !== "undefined") { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } },
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStore.getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({ success: false, message: "Invalid server response" }));
  if (!response.ok) {
    if (response.status === 401 && !path.includes("/auth/login")) {
      authStore.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new ApiError(payload.message || "Request failed", response.status);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const formatMoney = (value: string | number | null | undefined, currency = "৳") => `${currency} ${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
export const formatDate = (value: string | Date, withTime = false) => new Date(value).toLocaleString("en-BD", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
