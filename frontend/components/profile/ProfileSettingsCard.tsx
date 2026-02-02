"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfileSettingsCard() {
  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          プロフィール
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <ProfileForm submitLabel="保存する" />
      </CardContent>
    </Card>
  );
}
