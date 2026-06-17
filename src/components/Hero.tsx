import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Languages, BookOpen, FileCheck, PenLine } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
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
              href="/write"
              className={buttonVariants({ size: "lg", className: "text-base px-8 py-6 h-auto gap-3" })}
            >
              <PenLine className="h-5 w-5" />
              中文写作翻译
            </Link>
            <Link
              href="/correct"
              className={buttonVariants({ variant: "outline", size: "lg", className: "text-base px-8 py-6 h-auto gap-3" })}
            >
              <FileCheck className="h-5 w-5" />
              英文文章批改
            </Link>
          </div>

          {/* 功能亮点 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg">
              <div className="p-2 rounded-full bg-primary/10">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">智能翻译</h3>
              <p className="text-sm text-muted-foreground">
                支持学术、商务、日常三种风格
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg">
              <div className="p-2 rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">语法分析</h3>
              <p className="text-sm text-muted-foreground">
                标注关键语法点，附带例句和常见错误
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg">
              <div className="p-2 rounded-full bg-primary/10">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">文章批改</h3>
              <p className="text-sm text-muted-foreground">
                按考试标准评分，逐句批注优化建议
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
