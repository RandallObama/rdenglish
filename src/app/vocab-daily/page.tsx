/**
 * /vocab-daily — 每日5词页面（SSR 包装器）
 * 复用项目标准模式：page.tsx 做 auth 校验，渲染客户端组件
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VocabDailyClient } from "./client";

export default async function VocabDailyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <VocabDailyClient />
    </div>
  );
}
