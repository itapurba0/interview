/**
 * HireOps Unified API Client
 * Standardizes fetch calls with automatic JWT injection and base URL handling.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Utility to parse cookies in a vanilla JS environment.
 * Keeps bundle weight near zero by avoiding external libraries like js-cookie.
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

/**
 * Standard Fetch Wrapper for the HireOps platform.
 * @param endpoint - The API path (must start with /api/v1/)
 * @param options - Standard RequestInit options
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  // 1. Automatic JWT Injection - Check localStorage first, then cookies
  let token: string | undefined;

  if (typeof window !== "undefined") {
    // Priority 1: Check localStorage for token (standard JWT storage)
    token = localStorage.getItem("token") || localStorage.getItem("access_token");
  }

  // Priority 2: Fall back to secure session cookie
  if (!token) {
    token = getCookie("hireops_session");
  }

  // 3. Attach Bearer token to Authorization header
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // 2. Default JSON headers for body-based requests
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  // 4. Centralized Error Handling
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } else {
        // Handle plain text or HTML error responses
        const errorText = await response.text();
        errorMessage = `Server Error (${response.status}): ${errorText.substring(0, 100)}${errorText.length > 100 ? "..." : ""}`;
      }
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
    }

    console.error(`API Error [${response.status}]:`, errorMessage);

    // Explicit 401 handling (e.g., token expired or not authenticated)
    if (response.status === 401) {
      // Clear both storage mechanisms and force logout if necessary
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        document.cookie = "hireops_session=; path=/; max-age=0;";
        // Optionally redirect to login page
        // window.location.href = "/login";
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * SWR-compatible fetcher.
 * Delegates to fetchApi so JWT injection and error handling are consistent.
 */
export const swrFetcher = <T>(url: string): Promise<T> => fetchApi<T>(url);
