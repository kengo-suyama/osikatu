"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";

import AvatarCircle from "@/components/common/AvatarCircle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError } from "@/lib/repo/http";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { postRepo } from "@/lib/repo/postRepo";
import type { CircleDto, MeDto, PostDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};

export default function CircleChatScreen({ circleId }: { circleId: number }) {
  const router = useRouter();
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [messages, setMessages] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{circleName} チャット</div>
      </div>

      <Card className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-3">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : resolvedMessages.length === 0 ? (
            <div className="text-xs text-muted-foreground">まだチャットがありません</div>
          ) : (
            resolvedMessages.map((message, index) => {
              const prev = resolvedMessages[index - 1];
              const isSameAuthor = prev?.author?.id === message.author?.id;
              const isMine = me && message.author?.name === me.name;
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
                      src={message.author.avatarUrl ?? null}
                      nickname={message.author.name}
                      size={28}
                    />
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                  <div className={cn("max-w-[75%] space-y-1", isMine && "text-right")}>
                    {!isMine && !isSameAuthor ? (
                      <div className="text-[11px] text-muted-foreground">
                        {message.author.name}
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
