export const DATA_SOURCE =
  process.env.NEXT_PUBLIC_DATA_SOURCE?.toLowerCase() ?? "local";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const isApiMode = () => DATA_SOURCE === "api";
