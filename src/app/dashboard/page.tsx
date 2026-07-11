import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { WeekendChallengeBadge } from "@/components/WeekendChallengeBadge";
import { DashboardPrefetcher } from "@/components/DashboardPrefetcher";

/** 三个仪表盘按钮统一的深色方块样式 */
const BTN_STYLE = { color: "#ABD1C6", backgroundColor: "#312F2C" };
const BTN_CLASS =
  "group flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-2xl text-lg sm:text-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* 品牌标题图（透明背景，暗色模式自动反色） */}
      <div className="mb-10 flex justify-center">
        <Image
          src="/title-logo-transparent.png"
          alt="Rdaily English"
          width={640}
          height={160}
          className="w-full max-w-[640px] h-auto dark:invert"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <Link href="/start-writing" className={BTN_CLASS} style={BTN_STYLE}>
          开始写作
        </Link>

        <Link href="/tools" className={BTN_CLASS} style={BTN_STYLE}>
          小工具
        </Link>

        <Link href="/vocab-daily" className={BTN_CLASS} style={BTN_STYLE}>
          每日5词
        </Link>
      </div>

      {/* 周末挑战入口 */}
      <WeekendChallengeBadge />

      {/* 后台预取常用页面数据 */}
      <DashboardPrefetcher />
    </div>
  );
}
