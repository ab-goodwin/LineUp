import { supabase } from "./supabase";

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isApiRequest(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.origin);
    return (
      resolved.origin === window.location.origin &&
      resolved.pathname.startsWith("/api")
    );
  } catch {
    return url.startsWith("/api");
  }
}

let installed = false;

/**
 * Patches the global fetch so every same-origin /api request automatically
 * carries the Supabase access token. Calls that already set an Authorization
 * header (e.g. apiRequest/getQueryFn) are left untouched.
 */
export function installAuthFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!isApiRequest(getUrl(input))) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined),
    );

    if (!headers.has("Authorization")) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers });
  };
}
