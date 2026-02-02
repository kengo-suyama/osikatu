import HeaderOshiSwitcher from "@/components/layout/HeaderOshiSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-[430px] flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="text-lg font-semibold tracking-tight">Osikatu</div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary whitespace-nowrap">
            推し活中
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeaderOshiSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
