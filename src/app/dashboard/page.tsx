import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
        {/* 开始写作 — 深棕灰文字 + 薄荷绿背景 */}
        <Link
          href="/start-writing"
          className="group flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            color: "#312F2C",
            backgroundColor: "#ABD1C6",
          }}
        >
          开始写作
        </Link>

        {/* 小工具 — 薄荷绿文字 + 深棕灰背景 */}
        <Link
          href="/tools"
          className="group flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            color: "#ABD1C6",
            backgroundColor: "#312F2C",
          }}
        >
          小工具
        </Link>
      </div>
    </div>
  );
}
