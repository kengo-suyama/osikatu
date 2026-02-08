"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CircleDto, MeDto, PostDto } from "@/lib/types";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { postRepo } from "@/lib/repo/postRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PinParts = {
  title: string;
  url: string | null;
  body: string;
  checklist: { checked: boolean; text: string }[];
};

const normalizeNewlines = (text: string) => text.replace(/\r\n/g, "\n");

const parsePinBody = (raw: string): PinParts => {
  const body = normalizeNewlines(raw ?? "");
  const lines = body.split("\n");

  const titleRaw = (lines[0] ?? "").trim();
  const title = titleRaw.length > 0 ? titleRaw : "(無題)";

  let url: string | null = null;
  const checklist: { checked: boolean; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const urlMatch = /^URL:\s*(\S+)\s*$/i.exec(trimmed);
    if (urlMatch && !url) {
      url = urlMatch[1];
      continue;
    }
    const todoMatch = /^-\s*\[( |x|X)\]\s*(.+)\s*$/.exec(trimmed);
    if (todoMatch) {
      checklist.push({ checked: todoMatch[1].toLowerCase() === "x", text: todoMatch[2] });
    }
  }

  const rest = lines
    .slice(1)
    .filter((line) => {
      const trimmed = line.trim();
      if (/^URL:\s*/i.test(trimmed)) return false;
      if (/^-\s*\[( |x|X)\]\s+/.test(trimmed)) return false;
      return true;
    });
  const restBody = rest.join("\n").trim();

  return { title, url, body: restBody, checklist };
};

const buildPinBody = (title: string, url: string, body: string) => {
  const lines: string[] = [];
  lines.push((title ?? "").trim() || "(無題)");
  const urlTrimmed = (url ?? "").trim();
  if (urlTrimmed) lines.push(`URL: ${urlTrimmed}`);
  const bodyTrimmed = normalizeNewlines(body ?? "").trim();
  if (bodyTrimmed) lines.push(bodyTrimmed);
  return lines.join("\n");
};

const sortPinsDesc = (pins: PostDto[]) =>
  [...pins].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return bTime - aTime;
    const aId = typeof a.id === "number" ? a.id : Number.parseInt(String(a.id), 10);
    const bId = typeof b.id === "number" ? b.id : Number.parseInt(String(b.id), 10);
    if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) return bId - aId;
    return String(b.id).localeCompare(String(a.id));
  });

export default function CirclePinsScreen({ circleId }: { circleId: number }) {
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [pins, setPins] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PostDto | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formBody, setFormBody] = useState("");

  const role = circle?.myRole ?? "member";
  const canManage = role === "owner" || role === "admin";
  const maxPins = me?.plan === "plus" && canManage ? 10 : 3;

  const pinnedCount = pins.length;
  const limitReached = pinnedCount >= maxPins;

  const headerNote = useMemo(() => {
    if (!canManage) return "閲覧のみ（運営メンバーのみ編集できます）";
    if (me?.plan === "plus") return "運営向け（最大10件まで固定できます）";
    return "運営向け（Freeは最大3件まで固定できます）";
  }, [canManage, me?.plan]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [circleData, meData, posts] = await Promise.all([
        circleRepo.get(circleId),
        meRepo.getMe(),
        postRepo.list(circleId),
      ]);

      setCircle(circleData);
      setMe(meData);
      const pinned = posts.filter((p) => p.isPinned);
      setPins(sortPinsDesc(pinned));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setError("このサークルは閲覧できません（権限がありません）");
      } else {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      }
      setCircle(null);
      setMe(null);
      setPins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  const openAdd = () => {
    setEditing(null);
    setFormTitle("");
    setFormUrl("");
    setFormBody("");
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (post: PostDto) => {
    setEditing(post);
    const parts = parsePinBody(post.body);
    setFormTitle(parts.title === "(無題)" ? "" : parts.title);
    setFormUrl(parts.url ?? "");
    setFormBody(parts.body);
    setError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    if (saving) return;
    if (!canManage) return;

    setSaving(true);
    setError(null);
    try {
      const body = buildPinBody(formTitle, formUrl, formBody);
      if (editing) {
        const updated = await postRepo.updatePin(circleId, editing.id, body);
        setPins((prev) => sortPinsDesc(prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))));
      } else {
        const created = await postRepo.createPin(circleId, body);
        setPins((prev) => sortPinsDesc([created, ...prev]));
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const unpin = async (post: PostDto) => {
    if (!canManage) return;
    if (mutatingId) return;
    const postId = String(post.id);
    setError(null);
    try {
      setMutatingId(postId);
      await postRepo.unpin(circleId, post.id);
      setPins((prev) => prev.filter((p) => String(p.id) !== postId));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "解除に失敗しました");
      }
    } finally {
      setMutatingId(null);
    }
  };

  const toggleChecklist = async (post: PostDto, itemIndex: number) => {
    if (!canManage) return;
    if (mutatingId) return;

    const postId = String(post.id);
    const raw = normalizeNewlines(post.body ?? "");
    const lines = raw.split("\n");

    const checklistLineIndexes: number[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (/^-\s*\[( |x|X)\]\s+/.test(lines[i].trim())) checklistLineIndexes.push(i);
    }

    const lineIndex = checklistLineIndexes[itemIndex];
    if (lineIndex === undefined) return;

    const before = lines[lineIndex];
    const toggled = before.replace(
      /^(\s*-\s*\[)( |x|X)(\])(\s+)/,
      (_m, p1: string, state: string, p3: string, ws: string) =>
        `${p1}${state.trim() ? " " : "x"}${p3}${ws}`
    );
    if (toggled === before) return;

    const nextLines = [...lines];
    nextLines[lineIndex] = toggled;
    const nextBody = nextLines.join("\n");

    setError(null);
    setMutatingId(postId);
    setPins((prev) => prev.map((p) => (String(p.id) === postId ? { ...p, body: nextBody } : p)));

    try {
      const updated = await postRepo.updatePin(circleId, post.id, nextBody);
      setPins((prev) => sortPinsDesc(prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))));
    } catch (err) {
      // rollback
      setPins((prev) => prev.map((p) => (String(p.id) === postId ? { ...p, body: post.body } : p)));
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    } finally {
      setMutatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6" data-testid="circle-pins">
        <div className="text-sm text-muted-foreground">読み込み中…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="circle-pins">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold">遠征情報（ピン）</div>
          <div className="text-xs text-muted-foreground">集合・会場・持ち物など、固定情報をまとめます</div>
          <div className="text-xs text-muted-foreground">
            {pinnedCount}/{maxPins} · {headerNote}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/circles/${circleId}`}>戻る</Link>
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openAdd}
              disabled={limitReached}
              data-testid="pins-add"
            >
              + 追加
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3 text-sm" data-testid="pin-error">
          {error}
        </Card>
      ) : null}

      {canManage && limitReached ? (
        <Card className="rounded-2xl border p-3 text-xs text-muted-foreground">
          ピンの上限に達しています。不要なピンを解除してから追加してください。
        </Card>
      ) : null}

      <div className="space-y-3">
        {pins.length ? (
          pins.map((post) => {
            const parts = parsePinBody(post.body);
            const postId = String(post.id);
            return (
              <Card
                key={postId}
                className="rounded-2xl border p-4 shadow-sm"
                data-testid={`pin-item-${postId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{parts.title}</div>
                    {parts.url ? (
                      <a
                        href={parts.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-xs underline opacity-80 hover:opacity-100"
                      >
                        {parts.url}
                      </a>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(post)}
                        data-testid={`pin-edit-${postId}`}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void unpin(post)}
                        disabled={mutatingId === postId}
                        data-testid={`pin-unpin-${postId}`}
                      >
                        解除
                      </Button>
                    </div>
                  ) : null}
                </div>

                {parts.checklist.length ? (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">チェックリスト</div>
                    <div className="space-y-1">
                      {parts.checklist.map((item, idx) => (
                        <button
                          key={`${postId}-${idx}`}
                          type="button"
                          className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-muted/30"
                          onClick={() => void toggleChecklist(post, idx)}
                          disabled={!canManage || mutatingId === postId}
                          data-testid={`pin-check-${postId}-${idx}`}
                          aria-checked={item.checked}
                          role="checkbox"
                        >
                          <div className="mt-0.5 text-xs opacity-70">{item.checked ? "✓" : "□"}</div>
                          <div className="min-w-0 flex-1">{item.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {parts.body ? (
                  <div className="mt-3 whitespace-pre-wrap text-sm opacity-90">{parts.body}</div>
                ) : null}
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
            まだピンがありません
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="pin-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "ピンを編集" : "ピンを追加"}</DialogTitle>
            <DialogDescription>
              タイトルとURLは見やすく表示されます。チェックリストは本文の{" "}
              <span className="font-mono">- [ ]</span> / <span className="font-mono">- [x]</span>{" "}
              を自動で表示します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">タイトル</div>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例: 集合場所・持ち物"
                data-testid="pin-title"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">リンク（任意）</div>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                data-testid="pin-url"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">本文</div>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={"例:\n- [ ] 会場の最寄り出口\n- [x] チケット発券\n\n補足メモ…"}
                data-testid="pin-body"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-2 text-xs" data-testid="pin-error">
              {error}
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving} data-testid="pin-save">
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
