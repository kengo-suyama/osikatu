const readDataSource = () => {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem("osikatu:data-source");
    if (override) return override.toLowerCase();
  }
  return process.env.NEXT_PUBLIC_DATA_SOURCE?.toLowerCase() ?? "local";
};

const readApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem("osikatu:api-base-url");
    if (override) return override.trim();
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
};

export const API_BASE_URL = readApiBaseUrl().trim();

export const isApiMode = () => readDataSource() === "api";
