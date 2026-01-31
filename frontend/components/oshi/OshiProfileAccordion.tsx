"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatBirthdayCountdown, getDaysUntilNextBirthday } from "@/lib/birthday";
import type { Oshi } from "@/lib/uiTypes";

const renderList = (items: string[]) =>
  items.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-muted px-2 py-0.5 text-xs">
          #{item}
        </span>
      ))}
    </div>
  ) : (
    <div className="text-xs text-muted-foreground">未登録</div>
  );

export default function OshiProfileAccordion({ oshi }: { oshi: Oshi }) {
  const profile = oshi.profile;
  const days = getDaysUntilNextBirthday(profile.birthday ?? null);
  const countdown = formatBirthdayCountdown(days);

  return (
    <Accordion type="single" collapsible className="space-y-2">
      <AccordionItem value="basic" className="rounded-2xl border px-4">
        <AccordionTrigger>基本情報</AccordionTrigger>
        <AccordionContent className="space-y-2">
          <div className="text-sm">推し名: {oshi.name}</div>
          <div className="text-sm">愛称: {profile.nickname || "未登録"}</div>
          <div className="text-sm">誕生日: {profile.birthday || "未登録"} · {countdown}</div>
          <div className="text-sm">
            身長/体重: {profile.height_cm ?? "-"}cm / {profile.weight_kg ?? "-"}kg
          </div>
          <div className="text-sm">血液型: {profile.blood_type || "未登録"}</div>
          <div className="flex items-center gap-2 text-sm">
            <span>推しカラー:</span>
            {profile.accent_color ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-white/60"
                  style={{ backgroundColor: `hsl(${profile.accent_color})` }}
                />
                <span className="text-xs text-muted-foreground">{profile.accent_color}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">未登録</span>
            )}
          </div>
          <div className="text-sm">出身地: {profile.origin || "未登録"}</div>
          <div className="text-sm">属性: {profile.role || "未登録"}</div>
          <div className="text-sm">チャームポイント: {profile.charm_point || "未登録"}</div>
          <div className="text-sm">口癖/名言: {profile.quote || "未登録"}</div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="tags" className="rounded-2xl border px-4">
        <AccordionTrigger>タグ</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">趣味</div>
            {renderList(profile.hobbies)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">好き</div>
            {renderList(profile.likes)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">苦手</div>
            {renderList(profile.dislikes)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">特技</div>
            {renderList(profile.skills)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">好きな食べ物</div>
            {renderList(profile.favorite_foods)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">弱点</div>
            {renderList(profile.weak_points)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">供給タグ</div>
            {renderList(profile.supply_tags)}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="anniversaries" className="rounded-2xl border px-4">
        <AccordionTrigger>記念日</AccordionTrigger>
        <AccordionContent className="space-y-2">
          {profile.anniversaries.length === 0 ? (
            <div className="text-xs text-muted-foreground">未登録</div>
          ) : (
            profile.anniversaries.map((item, index) => (
              <div key={`${item.label}-${index}`} className="text-sm">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {item.date} {item.note ? `· ${item.note}` : ""}
                </div>
              </div>
            ))
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="links" className="rounded-2xl border px-4">
        <AccordionTrigger>リンク</AccordionTrigger>
        <AccordionContent className="space-y-2">
          {profile.links.length === 0 ? (
            <div className="text-xs text-muted-foreground">未登録</div>
          ) : (
            profile.links.map((item, index) => (
              <div key={`${item.label}-${index}`} className="text-sm">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.url}</div>
              </div>
            ))
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="custom" className="rounded-2xl border px-4">
        <AccordionTrigger>カスタム</AccordionTrigger>
        <AccordionContent className="space-y-2">
          {profile.custom_fields.length === 0 ? (
            <div className="text-xs text-muted-foreground">未登録</div>
          ) : (
            profile.custom_fields.map((item, index) => (
              <div key={`${item.key}-${index}`} className="text-sm">
                <div className="font-medium">{item.key}</div>
                <div className="text-xs text-muted-foreground">{item.value}</div>
              </div>
            ))
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="memo" className="rounded-2xl border px-4">
        <AccordionTrigger>メモ</AccordionTrigger>
        <AccordionContent>
          {profile.memo ? (
            <p className="text-sm text-foreground/90">{profile.memo}</p>
          ) : (
            <div className="text-xs text-muted-foreground">未登録</div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
