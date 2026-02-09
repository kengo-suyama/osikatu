"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CircleDto, CirclePinDto, MeDto } from "@/lib/types";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { pinsRepo } from "@/lib/repo/pinsRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const sortPinsDesc = (pins: CirclePinDto[]) =>
  [...pins].sort((a, b) => {
    // Mirror the API ordering:
    // 1) sortOrder DESC (nulls last)
    // 2) pinnedAt DESC
    // 3) id DESC
    const aNull = a.sortOrder == null;
    const bNull = b.sortOrder == null;
    if (aNull !== bNull) return aNull ? 1 : -1;

    const aSort = a.sortOrder ?? 0;
    const bSort = b.sortOrder ?? 0;
    if (aSort !== bSort) return bSort - aSort;

    const aTime = new Date(a.pinnedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.pinnedAt ?? b.createdAt ?? 0).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return bTime - aTime;

    return b.id - a.id;
  });

export default function CirclePinsScreen({ circleId }: { circleId: number }) {
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [pins, setPins] = useState<CirclePinDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CirclePinDto | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formChecklist, setFormChecklist] = useState<{ checked: boolean; text: string }[]>([]);

  const role = circle?.myRole ?? "member";
  const canManage = role === "owner" || role === "admin";
  const maxPins = me?.plan === "plus" && canManage ? 10 : 3;

  const pinnedCount = pins.length;
  const limitReached = pinnedCount >= maxPins;

  const pinKey = (pin: CirclePinDto) => String(pin.sourcePostId ?? pin.id);

  const headerNote = useMemo(() => {
    if (!canManage) return "閲覧のみ（運営メンバーのみ編集できます）";
    if (me?.plan === "plus") return "運営向け（最大10件まで固定できます）";
    return "運営向け（Freeは最大3件まで固定できます）";
  }, [canManage, me?.plan]);

  const reloadPins = async () => {
    const items = await pinsRepo.list(circleId);
    setPins(sortPinsDesc(items));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [circleData, meData, pinItems] = await Promise.all([
        circleRepo.get(circleId),
        meRepo.getMe(),
        pinsRepo.list(circleId),
      ]);

      setCircle(circleData);
      setMe(meData);
      setPins(sortPinsDesc(pinItems));
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
    setFormChecklist([]);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (pin: CirclePinDto) => {
    setEditing(pin);
    const parts = parsePinBody(pin.body);
    setFormTitle(parts.title === "(無題)" ? "" : parts.title);
    setFormUrl(parts.url ?? "");
    setFormBody(parts.body);
    setFormChecklist(parts.checklist.map((c) => ({ ...c })));
    setError(null);
    setDialogOpen(true);
  };

  const formatWriteError = (err: unknown, fallback: string) => {
    if (err instanceof ApiRequestError) {
      if (err.code === "PINS_V1_DEPRECATED" || err.status === 410) {
        return "アプリが古い可能性があります。更新してから、もう一度お試しください。";
      }
      return err.message;
    }
    return err instanceof Error ? err.message : fallback;
  };

  const save = async () => {
    if (saving) return;
    if (!canManage) return;

    setSaving(true);
    setError(null);
    try {
      const checklistLines = formChecklist.map((c) => `- [${c.checked ? "x" : " "}] ${c.text}`).join("\n");
      const fullBody = checklistLines ? (formBody ? formBody + "\n" + checklistLines : checklistLines) : formBody;
      const body = buildPinBody(formTitle, formUrl, fullBody);
      if (editing) {
        await pinsRepo.update(circleId, editing.id, body);
        await reloadPins();
      } else {
        await pinsRepo.create(circleId, body);
        await reloadPins();
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      setError(formatWriteError(err, "保存に失敗しました"));
    } finally {
      setSaving(false);
    }
  };

  const unpin = async (pin: CirclePinDto) => {
    if (!canManage) return;
    if (mutatingId) return;
    const key = pinKey(pin);
    setError(null);
    try {
      setMutatingId(key);
      await pinsRepo.unpin(circleId, pin.id);
      await reloadPins();
    } catch (err) {
      setError(formatWriteError(err, "解除に失敗しました"));
    } finally {
      setMutatingId(null);
    }
  };

  const toggleChecklist = async (pin: CirclePinDto, itemIndex: number) => {
    if (!canManage) return;
    if (mutatingId) return;

    const key = pinKey(pin);
    const raw = normalizeNewlines(pin.body ?? "");
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
    setMutatingId(key);
    setPins((prev) => prev.map((p) => (pinKey(p) === key ? { ...p, body: nextBody } : p)));

    try {
      await pinsRepo.update(circleId, pin.id, nextBody);
      await reloadPins();
    } catch (err) {
      // rollback
      setPins((prev) => prev.map((p) => (pinKey(p) === key ? { ...p, body: pin.body } : p)));
      setError(formatWriteError(err, "保存に失敗しました"));
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
          pins.map((pin) => {
            const parts = parsePinBody(pin.body);
            const key = pinKey(pin);
            return (
              <Card
                key={key}
                className="rounded-2xl border p-4 shadow-sm"
                data-testid={`pin-item-${key}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{parts.title}</div>
                    {parts.url ? (
                      <a
                        href={parts.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs hover:bg-muted/40 transition"
                        data-testid="pin-url-preview"
                      >
                        <span className="truncate font-medium">{(() => { try { return new URL(parts.url).hostname; } catch { return parts.url; } })()}</span>
                        <span className="shrink-0 text-muted-foreground">↗</span>
                      </a>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(pin)}
                        data-testid={`pin-edit-${key}`}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void unpin(pin)}
                        disabled={mutatingId === key}
                        data-testid={`pin-unpin-${key}`}
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
                          key={`${key}-${idx}`}
                          type="button"
                          className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-muted/30"
                          onClick={() => void toggleChecklist(pin, idx)}
                          disabled={!canManage || mutatingId === key}
                          data-testid={`pin-check-${key}-${idx}`}
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
              <div className="text-xs text-muted-foreground">チェックリスト</div>
              <div className="space-y-1" data-testid="pin-checklist-editor">
                {formChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs"
                      onClick={() => setFormChecklist((prev) => prev.map((c, i) => i === idx ? { ...c, checked: !c.checked } : c))}
                      data-testid={`pin-checklist-toggle-${idx}`}
                    >
                      {item.checked ? "✓" : "□"}
                    </button>
                    <Input
                      value={item.text}
                      onChange={(e) => setFormChecklist((prev) => prev.map((c, i) => i === idx ? { ...c, text: e.target.value } : c))}
                      className="h-7 text-xs"
                      data-testid={`pin-checklist-text-${idx}`}
                    />
                    <button
                      type="button"
                      className="text-xs text-rose-500 hover:text-rose-600"
                      onClick={() => setFormChecklist((prev) => prev.filter((_, i) => i !== idx))}
                      data-testid={`pin-checklist-remove-${idx}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFormChecklist((prev) => [...prev, { checked: false, text: "" }])}
                  data-testid="pin-checklist-add"
                >
                  + 項目を追加
                </Button>
              </div>
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

          <DialogFooter>
            <div className="flex justify-end gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
