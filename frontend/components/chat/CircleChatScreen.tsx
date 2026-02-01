"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import AvatarCircle from "@/components/common/AvatarCircle";
import SpecialBackground from "@/components/theme/SpecialBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { postRepo } from "@/lib/repo/postRepo";
import type { CircleDto, MeDto, PostDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL_THEMES } from "@/src/theme/themes";

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};

export default function CircleChatScreen({ circleId }: { circleId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [messages, setMessages] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [specialBgEnabled, setSpecialBgEnabled] = useState(false);
  const [circleThemeId, setCircleThemeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  const circleName = circle?.name ?? "サークル";

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [circleData, chatData, meData] = await Promise.all([
        circleRepo.get(circleId),
        postRepo.listChat(circleId),
        meRepo.getMe(),
      ]);
      setCircle(circleData);
      setMessages(chatData);
      setMe(meData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    eventsRepo.track(ANALYTICS_EVENTS.NAV_CHAT_OPEN, pathname, circleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    postRepo.markChatRead(circleId, last.createdAt);
  }, [circleId, messages]);

  useEffect(() => {
    if (circle?.ui) {
      setSpecialBgEnabled(Boolean(circle.ui.specialBgEnabled));
      setCircleThemeId(circle.ui.circleThemeId ?? null);
    } else {
      setSpecialBgEnabled(false);
      setCircleThemeId(null);
    }
  }, [circle?.ui?.circleThemeId, circle?.ui?.specialBgEnabled]);

  const canUseSpecialBg = me?.plan === "plus" && circle?.myRole === "owner";
  const showSpecialBg = Boolean(specialBgEnabled && !reduceMotion);
  const canUpdateTheme = canUseSpecialBg;
  const themeSelectValue = circleThemeId ?? "personal";

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await postRepo.sendChat(circleId, body);
      setMessages((prev) => [...prev, created]);
      setDraft("");
      setLimitReached(false);
      eventsRepo.track(ANALYTICS_EVENTS.CHAT_SEND_TEXT, pathname, circleId);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "plan_limit_chat_messages") {
        setLimitReached(true);
      } else {
        setError(err instanceof Error ? err.message : "送信に失敗しました");
      }
    } finally {
      setSending(false);
    }
  };

  const resolvedMessages = useMemo(() => {
    return messages.filter((item) => (item.postType ?? "post") === "chat");
  }, [messages]);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col gap-3">
      <SpecialBackground enabled={showSpecialBg} />

      <div className="relative z-10 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{circleName} チャット</div>
      </div>

      {canUpdateTheme ? (
        <Card className="relative z-10 space-y-3 rounded-2xl border p-3 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">サークルテーマ</div>
            <div className="text-xs text-muted-foreground">
              サークル内ページはこのテーマが優先されます（未設定なら個人テーマ）。
            </div>
          </div>
          <Select
            value={themeSelectValue}
            onValueChange={async (value) => {
              const nextTheme = value === "personal" ? null : value;
              setCircleThemeId(nextTheme);
              try {
                const ui = await circleRepo.updateUiSettings(circleId, {
                  circleThemeId: nextTheme,
                  specialBgEnabled,
                });
                setCircle((prev) =>
                  prev
                    ? {
                        ...prev,
                        ui: {
                          circleThemeId: ui?.circleThemeId ?? null,
                          specialBgEnabled: ui?.specialBgEnabled ?? false,
                          specialBgVariant: ui?.specialBgVariant ?? null,
                        },
                      }
                    : prev
                );
              } catch {
                setError("テーマの更新に失敗しました");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="テーマを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">個人テーマを使う</SelectItem>
              {ALL_THEMES.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">フェス背景（花びら・キラキラ）</div>
              <div className="text-xs text-muted-foreground">
                Plusのサークルリーダー限定 / 動く背景
              </div>
            </div>
            <Switch
              checked={specialBgEnabled}
              disabled={reduceMotion}
              onCheckedChange={async (checked) => {
                setSpecialBgEnabled(checked);
                try {
                  const ui = await circleRepo.updateUiSettings(circleId, {
                    circleThemeId,
                    specialBgEnabled: checked,
                  });
                  setCircle((prev) =>
                    prev
                      ? {
                          ...prev,
                          ui: {
                            circleThemeId: ui?.circleThemeId ?? null,
                            specialBgEnabled: ui?.specialBgEnabled ?? false,
                            specialBgVariant: ui?.specialBgVariant ?? null,
                          },
                        }
                      : prev
                  );
                } catch {
                  setError("背景設定の更新に失敗しました");
                }
              }}
            />
          </div>
          {reduceMotion ? (
            <div className="text-[11px] text-muted-foreground">
              端末の設定によりモーションが抑制されています。
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="relative z-10 flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-3">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : resolvedMessages.length === 0 ? (
            <div className="text-xs text-muted-foreground">まだチャットがありません</div>
          ) : (
            resolvedMessages.map((message, index) => {
              const prev = resolvedMessages[index - 1];
              const author = message.user ?? message.author;
              const prevAuthor = prev?.user ?? prev?.author;
              const isSameAuthor = prevAuthor?.id === author?.id;
              const isMine = me && author?.name === me.name;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMine && !isSameAuthor ? (
                    <AvatarCircle
                      src={author?.avatarUrl ?? null}
                      nickname={author?.name ?? "?"}
                      size={28}
                    />
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                  <div className={cn("max-w-[75%] space-y-1", isMine && "text-right")}>
                    {!isMine && !isSameAuthor ? (
                      <div className="text-[11px] text-muted-foreground">
                        {author?.name ?? "?"}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        isMine
                          ? "bg-[hsl(var(--accent))]/20 text-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.body}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {limitReached ? (
          <Card className="rounded-xl border border-border/60 p-3">
            <div className="text-xs font-semibold">Freeは月30メッセージまで</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              7日トライアル中は無制限で送れます。必要なときだけプランを比較できます。
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => router.push("/settings")}
            >
              プランを見る
            </Button>
          </Card>
        ) : null}

        {error ? <div className="text-xs text-red-500">{error}</div> : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="メッセージを入力"
            rows={2}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={sending || draft.trim().length === 0}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
