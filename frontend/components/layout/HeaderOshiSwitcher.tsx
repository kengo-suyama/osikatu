"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Oshi } from "@/lib/types";

const oshis: Oshi[] = [
  { id: "1", name: "‚³‚­‚ç" },
  { id: "2", name: "‚ê‚¢" },
  { id: "3", name: "‚ ‚¨‚¢" },
];

export default function HeaderOshiSwitcher() {
  const [value, setValue] = useState(oshis[0]?.id ?? "");

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="h-9 w-[120px]">
        <SelectValue placeholder="„‚µ‚ð‘I‘ð" />
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
