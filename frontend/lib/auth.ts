import { loadString, removeString, saveString } from "@/lib/storage";

const AUTH_TOKEN_KEY = "osikatu:auth:token";

export const getAuthToken = () => loadString(AUTH_TOKEN_KEY);

export const setAuthToken = (token: string) => {
  saveString(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  removeString(AUTH_TOKEN_KEY);
};

