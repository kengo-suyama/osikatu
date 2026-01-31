"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const oshis = [
  { id: "1", name: "蒼木ソラ" },
  { id: "2", name: "伊藤ミナ" },
  { id: "3", name: "加藤レイ" },
];

const digests = [
  { id: "daily", label: "毎日" },
  { id: "weekly", label: "週1" },
  { id: "off", label: "オフ" },
];

export default function SettingsPanel() {
  const [oshi, setOshi] = useState(oshis[0]?.id ?? "");
  const [digest, setDigest] = useState("daily");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="表示名" defaultValue="ミカ" />
          <Textarea
            placeholder="自己紹介"
            rows={3}
            defaultValue="推し活の記録とカフェ集合のこと。"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>推しの初期設定</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={oshi} onValueChange={setOshi}>
            <SelectTrigger>
              <SelectValue placeholder="推しを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {oshis.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={digest} onValueChange={setDigest}>
            <SelectTrigger>
              <SelectValue placeholder="配信まとめ" />
            </SelectTrigger>
            <SelectContent>
              {digests.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="通知しない時間" defaultValue="22:00 - 08:00" />
        </CardContent>
      </Card>

      <Button className="w-full">変更を保存</Button>
    </div>
  );
}
