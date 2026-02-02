import { API_BASE_URL } from "@/lib/config";
import { getDeviceId } from "@/lib/device";
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

const stripBom = (text: string) => text.replace(/^\uFEFF/, "");

const parseJson = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(stripBom(text));
  } catch {
    return null;
  }
};

const withDeviceIdHeader = (headers?: HeadersInit) => {
  if (typeof window === "undefined") return headers;
  try {
    const existing = new Headers(headers);
    if (!existing.has("X-Device-Id")) {
      existing.set("X-Device-Id", getDeviceId());
    }
    return existing;
  } catch {
    return headers;
  }
};

const mergeHeaders = (base?: HeadersInit, extra?: HeadersInit) => {
  if (!base && !extra) return undefined;
  try {
    const merged = new Headers(base);
    new Headers(extra).forEach((value, key) => {
      merged.set(key, value);
    });
    return merged;
  } catch {
    return extra ?? base;
  }
};

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: withDeviceIdHeader(init?.headers),
  });

  const text = await res.text().catch(() => "");
  const json = parseJson(text);

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
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const baseHeaders =
    body instanceof FormData ? undefined : { "Content-Type": "application/json" };
  const mergedHeaders = mergeHeaders(baseHeaders, init?.headers);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: withDeviceIdHeader(mergedHeaders),
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...init,
  });

  const text = await res.text().catch(() => "");
  const json = parseJson(text);

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
