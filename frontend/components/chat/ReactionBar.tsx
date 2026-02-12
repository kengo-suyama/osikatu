"use client";

import { useState } from "react";
import { addReaction, removeReaction } from "@/lib/repo/reactionRepo";

const REACTION_EMOJIS = [
  "❤️",
  "👍",
  "😂",
  "🎉",
  "🙏",
  "🔥",
  "😮",
  "😢",
];

type ReactionBarProps = {
  messageId: string;
  counts: Record<string, number>;
  myReacted: string[];
  onUpdate?: (counts: Record<string, number>, myReacted: string[]) => void;
};

export default function ReactionBar({
  messageId,
  counts: initialCounts,
  myReacted: initialMyReacted,
  onUpdate,
}: ReactionBarProps) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [myReacted, setMyReacted] = useState<string[]>(initialMyReacted);
  const [busy, setBusy] = useState(false);

  const handleToggle = async (emoji: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const isReacted = myReacted.includes(emoji);
      const result = isReacted
        ? await removeReaction(messageId, emoji)
        : await addReaction(messageId, emoji);
      setCounts(result.counts);
      setMyReacted(result.myReacted);
      onUpdate?.(result.counts, result.myReacted);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const hasAnyReaction = Object.values(counts).some((c) => c > 0);

  return (
    <div data-testid="reaction-bar">
      {hasAnyReaction ? (
        <div className="flex flex-wrap gap-1">
          {REACTION_EMOJIS.map((emoji) => {
            const count = counts[emoji] ?? 0;
            const isActive = myReacted.includes(emoji);
            if (count === 0) return null;
            return (
              <button
                key={emoji}
                type="button"
                data-testid={`reaction-emoji-${emoji}`}
                onClick={() => void handleToggle(emoji)}
                disabled={busy}
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
                  isActive
                    ? "border-primary/40 bg-primary/10"
                    : "border-border/40 hover:bg-muted/40"
                }`}
              >
                <span>{emoji}</span>
                <span
                  data-testid={`reaction-count-${emoji}`}
                  className="text-[10px] font-medium text-muted-foreground"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className={`flex gap-1 ${hasAnyReaction ? "mt-1" : ""} opacity-0 transition-opacity group-hover:opacity-100`}>
        {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
          <button
            key={emoji}
            type="button"
            data-testid={`reaction-emoji-${emoji}`}
            onClick={() => void handleToggle(emoji)}
            disabled={busy}
            className="rounded-full px-1 py-0.5 text-xs hover:bg-muted/40"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
