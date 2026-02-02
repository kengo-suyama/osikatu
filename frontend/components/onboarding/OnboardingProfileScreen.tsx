"use client";

import { useRouter } from "next/navigation";

import ProfileForm from "@/components/profile/ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { meRepo } from "@/lib/repo/meRepo";

export default function OnboardingProfileScreen() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">プロフィールを作成</h1>
        <p className="text-sm text-muted-foreground">
          表示名は必須です。後で設定することもできます。
        </p>
      </div>
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            あなたのプロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ProfileForm
            submitLabel="保存してはじめる"
            onSaved={() => router.replace("/home")}
          />
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={async () => {
                await meRepo.skipOnboarding();
                router.replace("/home");
              }}
            >
              後で設定する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
