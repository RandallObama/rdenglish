import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  remaining: number;
  totalAll: number;
  isPro: boolean;
}

export function StatsCards({
  remaining,
  totalAll,
  isPro,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            今日剩余
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {isPro ? "∞" : remaining}
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground mt-1">
              每日 3 次
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            当前方案
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {isPro ? "Pro" : "免费"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isPro ? "无限使用" : "每日 3 次"}
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-2 md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            总使用次数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalAll}</p>
        </CardContent>
      </Card>
    </div>
  );
}
