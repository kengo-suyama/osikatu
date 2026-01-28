export type ApiListResponse<T> = {
  data: T[];
};

export type ApiItemResponse<T> = {
  data: T;
};

export type ApiMeta = {
  current_page: number;
  last_page: number;
  total: number;
};

export type ApiPaginatedResponse<T> = {
  data: T[];
  meta: ApiMeta;
};

export type Oshi = {
  id: string;
  name: string;
  color?: string;
  avatarUrl?: string | null;
};

export type Log = {
  id: string;
  title: string;
  note?: string | null;
  date: string;
  time?: string | null;
  oshiId?: string | null;
};

export type Money = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category?: string | null;
  oshiId?: string | null;
};

export type Schedule = {
  id: string;
  title: string;
  date: string;
  place: string;
  oshiId?: string | null;
};

export type HomeSummary = {
  todayTime: string;
  todaySpend: string;
  logs: Log[];
};

export type MoneySummary = {
  items: Money[];
  chart: number[];
};
