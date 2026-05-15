const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    },
  });
}