import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBtnStyle } from "@/lib/button-colors";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* 品牌标题图（透明背景，暗色模式自动反色） */}
      <div className="mb-10 flex justify-center">
        <img
          src="/title-logo-transparent.png"
          alt="Rdaily English"
          className="w-full max-w-[640px] h-auto dark:invert"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
        <Link
          href="/start-writing"
          className="group flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={getBtnStyle("dashboard:write")}
        >
          开始写作
        </Link>

        <Link
          href="/tools"
          className="group flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{ color: "#312F2C", backgroundColor: "#ABD1C6" }}
        >
          小工具
        </Link>
      </div>
    </div>
  );
}
