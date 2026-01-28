export type ApiInit = RequestInit & { next?: { revalidate?: number } };

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiFetch<T>(path: string, init?: ApiInit): Promise<T> {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return (await res.json()) as T;
}
