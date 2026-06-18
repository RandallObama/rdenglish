import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PenLine, Wrench } from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-16 md:pt-24 pb-20 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* 品牌标题图（透明背景，暗色模式自动反色） */}
          <div className="mb-8 flex justify-center">
            <img
              src="/title-logo-transparent.png"
              alt="Rdaily English"
              className="w-full max-w-[640px] h-auto dark:invert"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-6">
            用地道英语
            <span className="text-primary block">表达你的想法</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto px-2">
            输入中文，智能翻译成地道英文，标注语法要点和词汇用法，
            让你的英语写作水平在练习中不断提升。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link
              href="/start-writing"
              className={buttonVariants({ size: "lg", className: "text-base px-8 py-6 h-auto gap-3" })}
              style={getBtnStyle("hero:write")}
            >
              <PenLine className="h-5 w-5" />
              开始写作
            </Link>
            <Link
              href="/tools"
              className={buttonVariants({ variant: "outline", size: "lg", className: "text-base px-8 py-6 h-auto gap-3" })}
              style={getBtnStyle("hero:correct")}
            >
              <Wrench className="h-5 w-5" />
              小工具
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
