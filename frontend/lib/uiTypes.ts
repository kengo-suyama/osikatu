export type SummaryChip = {
  id: string;
  label: string;
  value: string;
  tone?: "accent" | "muted" | "alert";
};

export type QuickAction = {
  id: string;
  label: string;
  title: string;
  description: string;
  placeholder: string;
};

export type SupplyCategory = "ライブ" | "グッズ" | "配信" | "コラボ";

export type SupplyItem = {
  id: string;
  title: string;
  category: SupplyCategory;
  date: string;
  period: "today" | "week";
  priority: "high" | "normal";
  badge?: string;
  note?: string;
};

export type DeadlineItem = {
  id: string;
  title: string;
  date: string;
  remain: string;
  level: "urgent" | "normal";
};

export type MoneyCategory = {
  id: string;
  label: string;
  amount: number;
};

export type MoneySnapshot = {
  budget: number;
  spent: number;
  remaining: number;
  categories: MoneyCategory[];
};

export type MoneyTransaction = {
  id: string;
  title: string;
  date: string;
  amount: number;
  category: string;
};

export type FeedPost = {
  id: string;
  name: string;
  handle: string;
  time: string;
  content: string;
  tags: string[];
  image?: boolean;
};

export type LogPost = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  time: string;
  date?: string;
  images?: string[];
  image?: boolean;
  isPrivate?: boolean;
};

export type LogMedia = {
  id: string;
  type: "image" | "video";
  url: string;
  name?: string;
};

export type AlbumEntry = {
  id: string;
  date: string;
  note: string;
  media: LogMedia[];
};

export type TicketStep = {
  id: string;
  label: string;
  date: string;
  status: "done" | "current" | "upcoming";
};

export type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  place: string;
  note?: string;
  conflict?: boolean;
};

export type Schedule = ScheduleItem;

export type LuckyColor = {
  name: string;
  value: string;
};

export type LuckyData = {
  color: LuckyColor;
  number: number;
  action: string;
  item: string;
};

export type OshiLink = { label: string; url: string };
export type Anniversary = { label: string; date: string; note?: string };
export type CustomField = { key: string; value: string };

export type OshiProfile = {
  nickname?: string | null;
  birthday?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_type?: string | null;
  accent_color?: string | null;
  origin?: string | null;
  role?: string | null;
  charm_point?: string | null;
  quote?: string | null;
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  skills: string[];
  favorite_foods: string[];
  weak_points: string[];
  supply_tags: string[];
  anniversaries: Anniversary[];
  links: OshiLink[];
  custom_fields: CustomField[];
  memo?: string | null;
  image_url?: string | null;
  image_base64?: string | null;
  image_frame_id?: string | null;
  updated_at?: string | null;
};

export type Oshi = {
  id: number | string;
  name: string;
  profile: OshiProfile;
  updated_at?: string | null;
};
