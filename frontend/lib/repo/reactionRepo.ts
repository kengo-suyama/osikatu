import { apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";

export type ReactionData = {
  messageId: number;
  counts: Record<string, number>;
  myReacted: string[];
};

const headers = () => ({
  "Content-Type": "application/json",
  "X-Device-Id": getDeviceId(),
});

export async function addReaction(
  messageId: number | string,
  emoji: string,
): Promise<ReactionData> {
  const rawId = typeof messageId === "string" ? messageId.replace(/^cm_/, "") : messageId;
  return apiSend<ReactionData>(
    `/api/chat/messages/${rawId}/reactions`,
    "POST",
    { emoji },
    { headers: headers() },
  );
}

export async function removeReaction(
  messageId: number | string,
  emoji: string,
): Promise<ReactionData> {
  const rawId = typeof messageId === "string" ? messageId.replace(/^cm_/, "") : messageId;
  return apiSend<ReactionData>(
    `/api/chat/messages/${rawId}/reactions/remove`,
    "POST",
    { emoji },
    { headers: headers() },
  );
}
