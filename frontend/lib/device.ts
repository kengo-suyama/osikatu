import { loadString, saveString } from "@/lib/storage";

const DEVICE_ID_KEY = "osikatu:device:id";

const createDeviceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getDeviceId = () => {
  const stored = loadString(DEVICE_ID_KEY);
  if (stored) return stored;
  const next = createDeviceId();
  saveString(DEVICE_ID_KEY, next);
  return next;
};
