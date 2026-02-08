const readDataSource = () => {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem("osikatu:data-source");
    if (override) return override.toLowerCase();
  }
  return process.env.NEXT_PUBLIC_DATA_SOURCE?.toLowerCase() ?? "local";
};

const readApiBaseUrl = () => {
  // In the browser, always use same-origin `/api/*` and rely on Next rewrites.
  // This avoids CORS/preflight issues (e2e/Windows) while keeping the API target configurable server-side.
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
};

export const API_BASE_URL = readApiBaseUrl().trim();

export const isApiMode = () => readDataSource() === "api";
