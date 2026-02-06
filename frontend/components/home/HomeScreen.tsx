"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, CalendarDays, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import CelebrationTrigger from "@/components/celebration/CelebrationTrigger";
import BirthdayHero from "@/components/birthday/BirthdayHero";
import OwnerDashboardCard from "@/components/circle/OwnerDashboardCard";
import CircleEntryCard from "@/components/circle/CircleEntryCard";
import CircleShareCard from "@/components/circle/CircleShareCard";
import CircleHomeCard from "@/components/circle/CircleHomeCard";
import PlanStatusCard from "@/components/common/PlanStatusCard";
import HowToUseDialog from "@/components/help/HowToUseDialog";
import MotionTabs from "@/components/tabs/MotionTabs";
import MotionFeed from "@/components/feed/MotionFeed";
import OshiAvatarCard from "@/components/oshi/OshiAvatarCard";
import OshiImageUpload from "@/components/oshi/OshiImageUpload";
import OshiFabPanel from "@/components/oshi/OshiFabPanel";
import QuickModeSwitch from "@/components/home/QuickModeSwitch";
import NextDeadlines from "@/components/widgets/NextDeadlines";
import { DailyLucky } from "@/components/widgets/DailyLucky";
import { AdBanner } from "@/components/ads/AdBanner";
import MoneyChart from "@/components/money/MoneyChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { deadlines, miniFeed, moneySnapshot, quickActions, supplies, todaySummary } from "@/lib/dummy";
import { DEFAULT_ACCENT_COLOR } from "@/lib/color";
import { ANALYTICS_EVENTS, EVENTS } from "@/lib/events";
import type { CircleChangeDetail } from "@/lib/events";
import { circleOwnerRepo } from "@/lib/repo/circleOwnerRepo";
import { circleRepo } from "@/lib/repo/circleRepo";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { deleteMeLog, listMyLogs } from "@/lib/repo/operationLogRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { fetchMySchedules } from "@/lib/repo/scheduleRepo";
import { localYearMonth, localDate } from "@/lib/date";
import { useBudgetState } from "@/lib/budgetState";
import { BudgetResponse } from "@/lib/repo/budgetRepo";
import { loadJson, loadString, removeString, saveJson, saveString } from "@/lib/storage";
import type { CircleDto, MeDto, OperationLogDto, OwnerDashboardDto, ScheduleDto } from "@/lib/types";
import type { Oshi, SupplyItem } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import { getSafeDisplayName, isProfileNameMissing } from "@/lib/ui/profileDisplay";
import { formatLogTime, logSentence } from "@/lib/ui/logText";
import { isApiMode } from "@/lib/config";

const OSHI_CATEGORIES = [
  "アイドル", "VTuber", "俳優", "声優", "アーティスト",
  "アニメキャラ", "スポーツ選手", "お笑い", "その他",
] as const;

const supplyTabs = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
];

const categoryFilters = ["全部", "ライブ", "グッズ", "配信", "コラボ"] as const;

type CategoryFilter = (typeof categoryFilters)[number];

const LATER_KEY = "osikatu:supply:later";
const OSHI_KEY = "osikatu:oshi:selected";
const COMPACT_KEY = "osikatu:home:compact";
const CIRCLE_KEY = "osikatu:circle:selected";
const LAST_CIRCLE_KEY = "osikatu.lastCircleId";
const QUICK_ACTION_URLS = {
  log: "/log?new=1",
  schedule: "/schedule?new=1",
  money: "/money?new=1",
  supply: "/log?tag=supply",
} as const;

const resolveCompact = (value: string | null) => {
  if (value === null) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
};

function sortSupplies(items: SupplyItem[]) {
  return [...items].sort((a, b) => {
    if (a.priority === b.priority) return 0;
    return a.priority === "high" ? -1 : 1;
  });
}

export default function HomeScreen() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryCompact = searchParams.get("compact");
  const [isCompact, setIsCompact] = useState(true);
  const [tab, setTab] = useState("today");
  const [filter, setFilter] = useState<CategoryFilter>("全部");
  const [laterIds, setLaterIds] = useState<string[]>([]);
  const [oshis, setOshis] = useState<Oshi[]>([]);
  const [oshisLoaded, setOshisLoaded] = useState(false);
  const [gateName, setGateName] = useState("");
  const [gateCategory, setGateCategory] = useState(OSHI_CATEGORIES[0]);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [selectedOshi, setSelectedOshi] = useState<Oshi | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardDto | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [me, setMe] = useState<MeDto | null>(null);
  const [myLogs, setMyLogs] = useState<OperationLogDto[]>([]);
  const [myLogsLoading, setMyLogsLoading] = useState(false);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleDto[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const defaultBudgetState = useMemo<BudgetResponse>(() => {
    const currentMonth = localYearMonth();
    return {
      budget: moneySnapshot.budget,
      spent: moneySnapshot.spent,
      yearMonth: currentMonth,
      updatedAt: null,
    };
  }, []);
  const [budgetInputs, setBudgetInputs] = useState<BudgetResponse>(defaultBudgetState);
  const [budgetMessage, setBudgetMessage] = useState<string | null>(null);
  const { budget: budgetData, loading: budgetLoading, saveBudget } =
    useBudgetState(defaultBudgetState);

  useEffect(() => {
    eventsRepo.track(ANALYTICS_EVENTS.APP_OPEN, pathname);
    eventsRepo.track(ANALYTICS_EVENTS.NAV_HOME, pathname);
    const storedLater = loadJson<string[]>(LATER_KEY);
    if (storedLater) setLaterIds(storedLater);

    const loadOshis = async () => {
      try {
        const list = await oshiRepo.getOshis();
        setOshis(list);
        setOshisLoaded(true);
        const storedOshi = loadString(OSHI_KEY);
        const resolved =
          list.find((oshi) => String(oshi.id) === String(storedOshi)) ?? list[0] ?? null;
        setSelectedOshi(resolved);
      } catch {
        setOshis([]);
        setOshisLoaded(true);
        setSelectedOshi(null);
      }
    };

    loadOshis();

    meRepo
      .getMe()
      .then((data) => setMe(data))
      .catch(() => setMe(null));

    const handleOshiChange = async (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      saveString(OSHI_KEY, next);
      try {
        const resolved = await oshiRepo.getOshi(next);
        if (!resolved) {
          setSelectedOshi(null);
          return;
        }
        setSelectedOshi(resolved);
        setOshis((prev) => {
          const exists = prev.some((oshi) => String(oshi.id) === String(resolved.id));
          if (!exists) return [...prev, resolved];
          return prev.map((oshi) =>
            String(oshi.id) === String(resolved.id) ? resolved : oshi
          );
        });
      } catch {
        return;
      }
    };

    const handleProfileChange = async (event: Event) => {
      const detail = (event as CustomEvent<{ oshiId: string | number }>).detail;
      try {
        const refreshed = await oshiRepo.getOshi(detail.oshiId);
        if (!refreshed) return;
        setOshis((prev) =>
          prev.map((item) => (String(item.id) === String(detail.oshiId) ? refreshed : item))
        );
        setSelectedOshi((prev) => {
          if (prev && String(prev.id) === String(detail.oshiId)) {
            return refreshed;
          }
          return prev;
        });
      } catch {
        return;
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.OSHI_CHANGE, handleOshiChange);
      window.addEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.OSHI_CHANGE, handleOshiChange);
        window.removeEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
      }
    };
  }, []);

  useEffect(() => {
    const storedCircle = loadString(CIRCLE_KEY);
    if (storedCircle) {
      const parsed = Number(storedCircle);
      if (!Number.isNaN(parsed)) setSelectedCircleId(parsed);
    }

    const handleCircleChange = (event: Event) => {
      const detail = (event as CustomEvent<CircleChangeDetail | string>).detail;
      const next =
        typeof detail === "string"
          ? detail
          : typeof detail?.circleId === "string"
            ? detail.circleId
            : "";
      const parsed = Number(next);
      if (Number.isNaN(parsed)) return;
      setSelectedCircleId(parsed);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.CIRCLE_CHANGE, handleCircleChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.CIRCLE_CHANGE, handleCircleChange);
      }
    };
  }, []);

  const loadOwnerDashboard = (circleId: number) => {
    setOwnerLoading(true);
    circleOwnerRepo
      .getOwnerDashboard(circleId)
      .then((data) => {
        setOwnerDashboard(data);
      })
      .catch(() => {
        setOwnerDashboard(null);
      })
      .finally(() => {
        setOwnerLoading(false);
      });
  };

  useEffect(() => {
    if (!selectedCircleId || !me || me.plan !== "plus") {
      setOwnerDashboard(null);
      return;
    }
    loadOwnerDashboard(selectedCircleId);
  }, [selectedCircleId, me]);

  useEffect(() => {
    if (!selectedCircleId || !isApiMode()) return;
    let mounted = true;
    circleRepo
      .get(selectedCircleId)
      .then((circle) => {
        if (!mounted) return;
        if (circle) return;
        setSelectedCircleId(null);
        removeString(CIRCLE_KEY);
        removeString(LAST_CIRCLE_KEY);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENTS.CIRCLE_CHANGE, { detail: { circleId: "" } })
          );
        }
      })
      .catch(() => {
        return;
      });
    return () => {
      mounted = false;
    };
  }, [selectedCircleId]);

  useEffect(() => {
    let mounted = true;
    setMyLogsLoading(true);
    listMyLogs({ limit: 5 })
      .then((data) => {
        if (!mounted) return;
        setMyLogs(data.items);
      })
      .catch(() => {
        if (!mounted) return;
        setMyLogs([]);
      })
      .finally(() => {
        if (!mounted) return;
        setMyLogsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setSchedulesLoading(true);
    const today = localDate();
    fetchMySchedules({ from: today })
      .then((items) => {
        if (!mounted) return;
        setUpcomingSchedules(items.slice(0, 5));
      })
      .catch(() => {
        if (!mounted) return;
        setUpcomingSchedules([]);
      })
      .finally(() => {
        if (!mounted) return;
        setSchedulesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setBudgetInputs(budgetData);
  }, [budgetData]);

  const handleCircleSelected = (circle: CircleDto) => {
    saveString(CIRCLE_KEY, String(circle.id));
    setSelectedCircleId(circle.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENTS.CIRCLE_CHANGE, { detail: { circleId: String(circle.id) } })
      );
    }
  };

  const safePush = (href?: string) => {
    if (!href) return;
    try {
      router.push(href);
    } catch (error) {
      console.error("Quick action navigation failed", error);
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === "log") {
      safePush(QUICK_ACTION_URLS.log);
      return;
    }
    if (actionId === "schedule") {
      safePush(QUICK_ACTION_URLS.schedule);
      return;
    }
    if (actionId === "money") {
      safePush(QUICK_ACTION_URLS.money);
      return;
    }
    if (actionId === "supply") {
      safePush(QUICK_ACTION_URLS.supply);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (typeof window !== "undefined" && !window.confirm("このログを削除してもよろしいですか？")) {
      return;
    }
    setDeletingLogId(logId);
    try {
      await deleteMeLog(logId);
      setMyLogs((prev) => prev.filter((log) => log.id !== logId));
    } catch {
      // ignore
    } finally {
      setDeletingLogId(null);
    }
  };

  const handleCreateFirstOshi = async () => {
    if (!gateName.trim()) return;
    setGateSubmitting(true);
    try {
      const created = await oshiRepo.createOshi({
        name: gateName.trim(),
        category: gateCategory,
      });
      setOshis([created]);
      setSelectedOshi(created);
      saveString(OSHI_KEY, String(created.id));
    } catch {
      // ignore – user stays on gate
    } finally {
      setGateSubmitting(false);
    }
  };

  const handleBudgetSave = async () => {
    setBudgetMessage(null);
    try {
      const result = await saveBudget(budgetInputs);
      setBudgetInputs(result);
      setBudgetMessage("保存しました");
    } catch {
      setBudgetMessage("保存に失敗しました");
    }
  };

  useEffect(() => {
    const queryValue = resolveCompact(queryCompact);
    if (queryValue !== null) {
      setIsCompact(queryValue);
      saveString(COMPACT_KEY, String(queryValue));
      return;
    }
    const stored = loadString(COMPACT_KEY);
    if (stored) setIsCompact(stored === "true");
  }, [queryCompact]);

  useEffect(() => {
    const handleCompactChange = (event: Event) => {
      const next = (event as CustomEvent<boolean>).detail;
      setIsCompact(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== COMPACT_KEY) return;
      if (event.newValue === null) return;
      setIsCompact(event.newValue === "true");
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.HOME_COMPACT_CHANGE, handleCompactChange);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.HOME_COMPACT_CHANGE, handleCompactChange);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  const filteredSupplies = useMemo(() => {
    const list = supplies.filter((item) => item.period === tab);
    const categoryFiltered =
      filter === "全部" ? list : list.filter((item) => item.category === filter);
    return sortSupplies(categoryFiltered);
  }, [tab, filter]);

  const toggleLater = (id: string) => {
    setLaterIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev];
      saveJson(LATER_KEY, next);
      return next;
    });
  };

  const displayedSupplies = filteredSupplies.slice(0, isCompact ? 3 : filteredSupplies.length);
  const displayedDeadlines = deadlines.slice(0, isCompact ? 3 : deadlines.length);
  const displayedFeed = miniFeed.slice(0, isCompact ? 2 : miniFeed.length);
  const accentColor = selectedOshi?.profile.accent_color ?? DEFAULT_ACCENT_COLOR;
  const remainingBudget = Math.max(budgetData.budget - budgetData.spent, 0);

  return (
    <div
      className={cn("space-y-4", isCompact && "space-y-3")}
      style={{ "--accent": accentColor } as CSSProperties}
    >
      {oshisLoaded && oshis.length === 0 ? (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="oshi-gate">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold">まずは推しを登録しよう</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <Input
              placeholder="推しの名前"
              value={gateName}
              onChange={(e) => setGateName(e.target.value)}
              data-testid="gate-oshi-name"
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={gateCategory}
              onChange={(e) => setGateCategory(e.target.value)}
              aria-label="推しカテゴリ"
              data-testid="gate-oshi-category"
            >
              {OSHI_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Button
              className="w-full"
              disabled={!gateName.trim() || gateSubmitting}
              onClick={handleCreateFirstOshi}
              data-testid="gate-submit"
            >
              {gateSubmitting ? "登録中..." : "推しを登録してはじめる"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted-foreground">Home</div>
        <HowToUseDialog />
      </div>
      {me ? (
        <div className="text-xs text-muted-foreground">
          {getSafeDisplayName(me.profile)}
          {isProfileNameMissing(me.profile) ? (
            <>
              {" "}
              · プロフィールは後で設定できます（
              <Link href="/settings" className="underline">
                設定へ
              </Link>
              ）
            </>
          ) : (
            " さんのホーム"
          )}
        </div>
      ) : null}

      {me?.plan === "plus" && selectedCircleId ? (
        <OwnerDashboardCard
          dashboard={ownerDashboard}
          loading={ownerLoading}
          onRefresh={() => selectedCircleId && loadOwnerDashboard(selectedCircleId)}
          onRemindAll={async () => {
            if (!selectedCircleId) return;
            try {
              await circleOwnerRepo.remindAll(selectedCircleId);
              loadOwnerDashboard(selectedCircleId);
            } catch {
              loadOwnerDashboard(selectedCircleId);
            }
          }}
        />
      ) : null}

      {me ? <PlanStatusCard me={me} compact={isCompact} /> : null}

      <AdBanner />

      {selectedOshi ? (
        <OshiAvatarCard
          oshi={selectedOshi}
          summary={todaySummary}
          compact={isCompact}
          onUpdated={(updated) => {
            setSelectedOshi(updated);
            setOshis((prev) =>
              prev.map((item) => (String(item.id) === String(updated.id) ? updated : item))
            );
          }}
        />
      ) : null}

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              操作ログ
            </CardTitle>
            <Link href="/logs" className="text-xs underline opacity-80 hover:opacity-100">
              もっと見る
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {myLogsLoading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : myLogs.length ? (
            myLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">{logSentence(log)}</div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDeleteLog(log.id)}
                    disabled={deletingLogId === log.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatLogTime(log.createdAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">ログがまだありません</div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="home-schedule-summary">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              次の予定
            </CardTitle>
            <Link href="/schedule" className="text-xs underline opacity-80 hover:opacity-100">
              すべて見る
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {schedulesLoading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : upcomingSchedules.length > 0 ? (
            upcomingSchedules.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-3"
                data-testid="home-schedule-item"
              >
                <div className="text-sm font-medium">{s.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {s.isAllDay
                      ? new Date(s.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
                      : new Date(s.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {s.location ? <span>· {s.location}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">予定がありません</div>
          )}
        </CardContent>
      </Card>

      {selectedCircleId ? <CircleHomeCard circleId={selectedCircleId} /> : null}

      {me?.plan === "plus" && selectedCircleId ? (
        <CircleShareCard circleId={selectedCircleId} />
      ) : null}

      {!selectedCircleId ? (
        <CircleEntryCard me={me} onCircleSelected={handleCircleSelected} />
      ) : null}

      <CelebrationTrigger
        oshiName={selectedOshi?.name ?? null}
        oshiBirthday={selectedOshi?.profile.birthday ?? null}
        anniversaries={selectedOshi?.profile.anniversaries ?? []}
      />

      {selectedOshi ? (
        <BirthdayHero
          oshiName={selectedOshi.name}
          nickname={selectedOshi.profile.nickname}
          birthdayISO={selectedOshi.profile.birthday}
          accentColor={accentColor}
        />
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-muted-foreground">クイックアクション</div>
          <QuickModeSwitch />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-2xl border bg-card text-left shadow-sm transition hover:shadow-md",
              isCompact ? "p-3" : "p-4"
            )}
          >
            <div className="text-sm font-semibold">
              推し画像を{selectedOshi?.profile.image_url || selectedOshi?.profile.image_base64 ? "変更" : "追加"}
            </div>
            <div className="text-xs text-muted-foreground">
              ホームに表示されるメイン画像
            </div>
            <div className="mt-3">
              {selectedOshi ? (
                <OshiImageUpload
                  oshiId={selectedOshi.id}
                  label={
                    selectedOshi.profile.image_url || selectedOshi.profile.image_base64
                      ? "画像を変更"
                      : "＋ 画像を追加"
                  }
                />
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  推しを選択
                </Button>
              )}
            </div>
          </div>
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleQuickAction(action.id)}
              className={cn(
                "rounded-2xl border bg-card text-left shadow-sm transition hover:shadow-md",
                isCompact ? "p-3" : "p-4"
              )}
            >
              <div className="text-sm font-semibold">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">供給まとめ</div>
        <MotionTabs tabs={supplyTabs} value={tab} onValueChange={setTab}>
          <TabsContent value="today" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    filter === category
                      ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {displayedSupplies.map((item) => (
                <Card
                  key={item.id}
                  className={cn("rounded-2xl border shadow-sm", isCompact ? "p-3" : "p-4")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {item.category}
                        </span>
                        {item.badge ? (
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              item.priority === "high"
                                ? "bg-red-500/15 text-red-600"
                                : "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.note ? (
                        <div className="text-xs text-muted-foreground">{item.note}</div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleLater(item.id)}
                    >
                      {laterIds.includes(item.id) ? (
                        <BookmarkCheck className="h-4 w-4 text-[hsl(var(--accent))]" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="week" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    filter === category
                      ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {displayedSupplies.map((item) => (
                <Card
                  key={item.id}
                  className={cn("rounded-2xl border shadow-sm", isCompact ? "p-3" : "p-4")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {item.category}
                        </span>
                        {item.badge ? (
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              item.priority === "high"
                                ? "bg-red-500/15 text-red-600"
                                : "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.note ? (
                        <div className="text-xs text-muted-foreground">{item.note}</div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleLater(item.id)}
                    >
                      {laterIds.includes(item.id) ? (
                        <BookmarkCheck className="h-4 w-4 text-[hsl(var(--accent))]" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </MotionTabs>
      </div>

      <NextDeadlines items={displayedDeadlines} />

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="home-budget-card">
        <CardHeader className="space-y-1 p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月あといくら？</CardTitle>
          <div className="text-3xl font-semibold" data-testid="home-budget-remaining">
            ¥{remainingBudget.toLocaleString("ja-JP")}
          </div>
          <div className="text-xs text-muted-foreground">
            予算 ¥{budgetData.budget.toLocaleString("ja-JP")} · 使用済み ¥
            {budgetData.spent.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className={cn("p-0", isCompact ? "h-32" : "h-44")}>
          <MoneyChart categories={moneySnapshot.categories} />
        </CardContent>
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">予算設定</div>
          <div className="grid gap-3">
            <Input
              type="number"
              value={budgetInputs.budget}
              onChange={(event) =>
                setBudgetInputs((prev) => ({ ...prev, budget: Number(event.target.value) }))
              }
              placeholder="予算"
              min={0}
              data-testid="home-budget-input"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleBudgetSave} disabled={budgetLoading} data-testid="home-budget-save">
              {budgetLoading ? "保存中..." : "保存"}
            </Button>
            {budgetMessage ? (
              <div className="text-xs text-muted-foreground">{budgetMessage}</div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground">ミニフィード</div>
        <MotionFeed items={displayedFeed} />
      </div>

      <DailyLucky compact={isCompact} />

      <OshiFabPanel
        oshi={selectedOshi}
        onUpdated={(updated) => {
          setSelectedOshi(updated);
          setOshis((prev) =>
            prev.map((item) => (String(item.id) === String(updated.id) ? updated : item))
          );
        }}
      />
    </div>
  );
}
