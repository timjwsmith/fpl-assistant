import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Try to parse error response as JSON to extract meaningful message
    try {
      const errorData = await res.json();
      // Extract the most specific error message available
      const message = errorData.details || errorData.error || errorData.message || res.statusText;
      throw new Error(message);
    } catch (jsonError) {
      // If JSON parsing fails, fall back to text
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || res.statusText);
    }
  }
}

export async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  console.log('[API] Starting request:', method, url);
  
  // Use AbortController for timeout on long-running AI requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[API] Request timeout after 60s for', url);
    controller.abort();
  }, 60000); // 60 second timeout for AI requests

  try {
    console.log('[API] Sending fetch request to', url);
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    console.log('[API] Fetch completed, status:', res.status);
    clearTimeout(timeoutId);
    
    await throwIfResNotOk(res);
    console.log('[API] Response OK, parsing JSON...');
    
    const result = await res.json();
    console.log('[API] Response received for', url, result);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[API] Request failed for', url, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
