import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function PricingPreview() {
  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-10">
          选择适合你的方案
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                免费版
                <Badge variant="secondary">入门</Badge>
              </CardTitle>
              <p className="text-3xl font-bold">¥0</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {[
                  "每日 3 次翻译机会",
                  "支持三种写作风格",
                  "语法要点分析",
                  "词汇用法标注",
                  "历史记录查看",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                免费开始
              </Link>
            </CardContent>
          </Card>
          <Card className="border-primary/50 relative">
            <div className="absolute -top-3 right-4">
              <Badge>即将推出</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pro 版
                <Badge>高级</Badge>
              </CardTitle>
              <p className="text-3xl font-bold">
                ¥19.9<span className="text-sm text-muted-foreground font-normal">/月</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {[
                  "无限次翻译使用",
                  "全部写作风格",
                  "深度语法分析报告",
                  "高级词汇搭配建议",
                  "作文批改功能",
                  "优先技术支持",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className={buttonVariants({ className: "w-full" })}
              >
                即将上线
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
