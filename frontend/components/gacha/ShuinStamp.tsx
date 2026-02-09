"use client";

import { cn } from "@/lib/utils";
import { SeimanStar } from "@/components/gacha/SeimanStar";

export function ShuinStamp({
  className,
  withSeimanStar = true,
}: {
  className?: string;
  withSeimanStar?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid h-16 w-16 place-items-center rounded-full border border-rose-800/40 bg-rose-700/10 text-rose-700 shadow-[inset_0_0_0_2px_rgba(136,19,55,0.15)]",
        className
      )}
      aria-hidden="true"
    >
      {withSeimanStar ? (
        <div className="absolute inset-0 grid place-items-center text-rose-700/35">
          <div className="h-14 w-14">
            <SeimanStar className="h-full w-full" />
          </div>
        </div>
      ) : null}
      <div className="relative grid h-14 w-14 place-items-center rounded-full border border-rose-800/35 bg-rose-700/20">
        <span className="text-2xl font-black tracking-tight text-rose-800/90">
          奉
        </span>
      </div>
    </div>
  );
}

