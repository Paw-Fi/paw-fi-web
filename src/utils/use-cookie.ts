import { useCallback } from "react";

export function useCookie() {
  // Read a cookie value by name
  function getCookie(name: string): string | undefined {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  // Set a cookie value
  const setCookie = useCallback((name: string, value: string, options?: { days?: number; path?: string; sameSite?: "Lax"|"Strict"|"None" }) => {
    if (typeof document === "undefined") return;
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options?.days) {
      const expires = new Date();
      expires.setDate(expires.getDate() + options.days);
      cookie += `; expires=${expires.toUTCString()}`;
    }
    cookie += `; path=${options?.path || "/"}`;
    cookie += `; SameSite=${options?.sameSite || "Lax"}`;
    document.cookie = cookie;
  }, []);

  return { getCookie, setCookie };
}
