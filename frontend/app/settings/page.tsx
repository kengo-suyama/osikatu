import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>テーマ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full">ライト</Button>
          <Button className="w-full" variant="secondary">
            ダーク
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>アカウント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full" variant="outline">
            プロフィール編集
          </Button>
          <Button className="w-full" variant="outline">
            通知設定
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
