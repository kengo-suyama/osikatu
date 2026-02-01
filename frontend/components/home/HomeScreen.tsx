"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
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
import MotionModal from "@/components/modal/MotionModal";
import MotionFeed from "@/components/feed/MotionFeed";
import OshiAvatarCard from "@/components/oshi/OshiAvatarCard";
import OshiImageUpload from "@/components/oshi/OshiImageUpload";
import OshiFabPanel from "@/components/oshi/OshiFabPanel";
import QuickModeSwitch from "@/components/home/QuickModeSwitch";
import NextDeadlines from "@/components/widgets/NextDeadlines";
import DailyLucky from "@/components/widgets/DailyLucky";
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
import { eventsRepo } from "@/lib/repo/eventsRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { listMyLogs } from "@/lib/repo/operationLogRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { loadJson, loadString, saveJson, saveString } from "@/lib/storage";
import type { CircleDto, MeDto, OperationLogDto, OwnerDashboardDto } from "@/lib/types";
import type { Oshi, SupplyItem } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import { getSafeDisplayName, isProfileNameMissing } from "@/lib/ui/profileDisplay";
import { formatLogTime, logSentence } from "@/lib/ui/logText";

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
  const queryCompact = searchParams.get("compact");
  const [isCompact, setIsCompact] = useState(true);
  const [tab, setTab] = useState("today");
  const [filter, setFilter] = useState<CategoryFilter>("全部");
  const [laterIds, setLaterIds] = useState<string[]>([]);
  const [oshis, setOshis] = useState<Oshi[]>([]);
  const [selectedOshi, setSelectedOshi] = useState<Oshi | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardDto | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [me, setMe] = useState<MeDto | null>(null);
  const [myLogs, setMyLogs] = useState<OperationLogDto[]>([]);
  const [myLogsLoading, setMyLogsLoading] = useState(false);

  useEffect(() => {
    eventsRepo.track(ANALYTICS_EVENTS.APP_OPEN, pathname);
    eventsRepo.track(ANALYTICS_EVENTS.NAV_HOME, pathname);
    const storedLater = loadJson<string[]>(LATER_KEY);
    if (storedLater) setLaterIds(storedLater);

    const loadOshis = async () => {
      try {
        const list = await oshiRepo.getOshis();
        setOshis(list);
        const storedOshi = loadString(OSHI_KEY);
        const resolved =
          list.find((oshi) => String(oshi.id) === String(storedOshi)) ?? list[0] ?? null;
        setSelectedOshi(resolved);
      } catch {
        setOshis([]);
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

  const handleCircleSelected = (circle: CircleDto) => {
    saveString(CIRCLE_KEY, String(circle.id));
    setSelectedCircleId(circle.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENTS.CIRCLE_CHANGE, { detail: { circleId: String(circle.id) } })
      );
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

  return (
    <div
      className={cn("space-y-4", isCompact && "space-y-3")}
      style={{ "--accent": accentColor } as CSSProperties}
    >
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
                <div className="text-sm">{logSentence(log)}</div>
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
            <MotionModal
              key={action.id}
              title={action.title}
              description={action.description}
              trigger={
                <button
                  type="button"
                  className={cn(
                    "rounded-2xl border bg-card text-left shadow-sm transition hover:shadow-md",
                    isCompact ? "p-3" : "p-4"
                  )}
                >
                  <div className="text-sm font-semibold">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </button>
              }
            >
              <div className="space-y-3">
                <Input placeholder="タイトル" />
                <Textarea placeholder={action.placeholder} rows={3} />
                <Button className="w-full">保存</Button>
              </div>
            </MotionModal>
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

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="space-y-1 p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月あといくら？</CardTitle>
          <div className="text-3xl font-semibold">
            ¥{moneySnapshot.remaining.toLocaleString("ja-JP")}
          </div>
          <div className="text-xs text-muted-foreground">
            予算 ¥{moneySnapshot.budget.toLocaleString("ja-JP")} · 使用済み ¥
            {moneySnapshot.spent.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className={cn("p-0", isCompact ? "h-32" : "h-44")}>
          <MoneyChart categories={moneySnapshot.categories} />
        </CardContent>
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
