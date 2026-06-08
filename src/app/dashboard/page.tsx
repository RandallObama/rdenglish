import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkUsage } from "@/lib/rate-limit";
import { StatsCards } from "@/components/StatsCards";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { PenLine, GraduationCap, ArrowRight, Crown } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const usage = await checkUsage(session.user.id);
  const totalWritings = await prisma.writing.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-start sm:items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            你好，{session.user.name || "同学"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            这里是你的学习概览
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/write" className={buttonVariants({ size: "sm" })}>
            <PenLine className="mr-2 h-4 w-4" />
            中文写作翻译
          </Link>
          <Link href="/correct" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <GraduationCap className="mr-2 h-4 w-4" />
            英文写作批改
          </Link>
        </div>
      </div>

      <StatsCards
        remaining={usage.remaining}
        totalAll={totalWritings}
        isPro={usage.isPro}
      />

      {/* 升级引导 */}
      {!usage.isPro && (
        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              升级到 Pro 版
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              解锁无限翻译次数、深度语法分析、作文批改等高级功能，让你的英语学习效率翻倍。
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-xl">¥19.9</span>
              <span className="text-muted-foreground">/月</span>
            </div>
            <button
              disabled
              className={buttonVariants({ variant: "secondary", className: "w-full" })}
            >
              即将上线 <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
