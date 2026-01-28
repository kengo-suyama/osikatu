import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "./providers";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";

export const metadata: Metadata = {
  title: "„‚µŠˆx‰‡",
  description: "„‚µŠˆx‰‡ƒAƒvƒŠ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-dvh bg-background text-foreground">
            <Header />
            <main className="mx-auto max-w-screen-sm px-4 pb-24 pt-4">
              {children}
            </main>
            <BottomNavigation />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
