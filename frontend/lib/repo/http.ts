import { API_BASE_URL } from "@/lib/config";
import type { ApiError, ApiSuccess } from "@/lib/types";

export class ApiRequestError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { error?: { code?: unknown; message?: unknown } };
  return Boolean(maybe.error?.code && maybe.error?.message);
}

function isApiSuccess(value: unknown): value is ApiSuccess<unknown> {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { success?: { data?: unknown } };
  return Boolean(maybe.success && "data" in maybe.success);
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (isApiError(json)) {
      throw new ApiRequestError(
        json.error.code,
        json.error.message,
        res.status,
        json.error.details
      );
    }
    throw new Error(`HTTP ${res.status}`);
  }

  if (!isApiSuccess(json)) {
    throw new Error("Invalid API envelope: success.data not found");
  }

  return json.success.data as T;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...init,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (isApiError(json)) {
      throw new ApiRequestError(
        json.error.code,
        json.error.message,
        res.status,
        json.error.details
      );
    }
    throw new Error(`HTTP ${res.status}`);
  }

  if (!isApiSuccess(json)) {
    throw new Error("Invalid API envelope: success.data not found");
  }

  return json.success.data as T;
}
