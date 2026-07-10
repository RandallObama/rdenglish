import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBtnStyle } from "@/lib/button-colors";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-background"
    >
      <div className="mt-auto" />

      {/* 品牌标题图（透明背景，暗色模式自动反色） */}
      <div className="mb-10 flex justify-center px-4 py-8">
        <Image
          src="/title-logo-transparent.png"
          alt="Rdaily English"
          width={640}
          height={160}
          priority
          className="w-full max-w-[640px] h-auto dark:invert"
        />
      </div>

      <Link
        href="/login"
        className={buttonVariants({ size: "lg", className: "text-2xl px-14 py-7 h-auto rounded-2xl" })}
        style={getBtnStyle("hero:write")}
      >
        立即登录
      </Link>

      <div className="mt-auto mb-24" />
    </main>
  );
}
