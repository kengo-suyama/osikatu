import rawPool from "../../shared/oshi-actions-ja.json";

const normalize = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const items = Array.isArray(rawPool) ? rawPool : [];

export const OSHI_ACTIONS_POOL: string[] = Array.from(
  new Set(items.map((item) => normalize(item)).filter((item) => item.length > 0))
);
