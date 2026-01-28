import HeaderOshiSwitcher from "@/components/layout/HeaderOshiSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">êÑÇµäà</div>
          <Button variant="secondary" size="sm">
            ç°ì˙
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <HeaderOshiSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
