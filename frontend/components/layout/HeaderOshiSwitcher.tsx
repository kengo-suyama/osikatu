"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const oshis = [
  { id: "1", name: "蒼木ソラ" },
  { id: "2", name: "伊藤ミナ" },
  { id: "3", name: "加藤レイ" },
];

export default function HeaderOshiSwitcher() {
  const [value, setValue] = useState(oshis[0]?.id ?? "");

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="h-9 w-[120px] text-xs">
        <SelectValue placeholder="推しを選ぶ" />
      </SelectTrigger>
      <SelectContent>
        {oshis.map((oshi) => (
          <SelectItem key={oshi.id} value={oshi.id}>
            {oshi.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
