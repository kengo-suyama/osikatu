import {
  TITLES_JA_1000_UNIVERSAL,
  type TitleEntry,
  type TitleRarity,
} from "@/lib/titles/titles_ja_1000_universal";

const rarityBuckets: Array<{ rarity: TitleRarity; threshold: number }> = [
  { rarity: "legendary", threshold: 1 },
  { rarity: "epic", threshold: 10 },
  { rarity: "rare", threshold: 30 },
  { rarity: "common", threshold: 100 },
];

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seed: number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const assignRarity = (title: TitleEntry): TitleRarity => {
  if (title.rarity) return title.rarity;
  const value = hashSeed(title.id) % 100;
  if (value < 1) return "legendary";
  if (value < 10) return "epic";
  if (value < 30) return "rare";
  return "common";
};

const pickRarity = (rng: () => number): TitleRarity => {
  const roll = rng() * 100;
  for (const bucket of rarityBuckets) {
    if (roll < bucket.threshold) return bucket.rarity;
  }
  return "common";
};

const filterByTags = (titles: TitleEntry[], tags: string[]) => {
  if (tags.length === 0) return titles;
  const domainTags = tags.filter((tag) => tag.startsWith("domain:"));
  const normalTags = tags.filter((tag) => !tag.startsWith("domain:"));

  let pool = titles;
  if (normalTags.length > 0) {
    const matched = titles.filter((entry) =>
      entry.tags?.some((tag) => normalTags.includes(tag))
    );
    if (matched.length > 0) {
      pool = matched;
    }
  }

  if (domainTags.length > 0) {
    const matched = pool.filter((entry) =>
      entry.tags?.some((tag) => domainTags.includes(tag))
    );
    if (matched.length > 0) {
      pool = matched;
    }
  }

  return pool;
};

export type PickedTitle = {
  entry: TitleEntry;
  rarity: TitleRarity;
};

export function pickTitle(options: {
  seed: string;
  tags?: string[];
}): PickedTitle {
  const rng = createRng(hashSeed(options.seed));
  const rarity = pickRarity(rng);
  const tagged = filterByTags(TITLES_JA_1000_UNIVERSAL, options.tags ?? []);
  const pool = tagged.length > 0 ? tagged : TITLES_JA_1000_UNIVERSAL;
  const byRarity = pool.filter((entry) => assignRarity(entry) === rarity);
  const finalPool = byRarity.length > 0 ? byRarity : pool;
  const index = Math.floor(rng() * finalPool.length);
  return {
    entry: finalPool[index] ?? pool[0],
    rarity,
  };
}
