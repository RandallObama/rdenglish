"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Sparkles,
  Calendar,
  Loader2,
  Target,
  AlertCircle,
} from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";
import type { ReportData, ReportPeriodType } from "@/types";

// Recharts is ~400KB — dynamically import chart components to reduce initial bundle size
const TranslationDailyChart = dynamic(
  () => import("@/components/ReportCharts").then((m) => m.TranslationDailyChart),
  { ssr: false, loading: () => <div className="animate-pulse h-[250px] bg-muted rounded-xl" /> }
);
const ScoreTrendChart = dynamic(
  () => import("@/components/ReportCharts").then((m) => m.ScoreTrendChart),
  { ssr: false, loading: () => <div className="animate-pulse h-[250px] bg-muted rounded-xl" /> }
);
const GrammarTrendChart = dynamic(
  () => import("@/components/ReportCharts").then((m) => m.GrammarTrendChart),
  { ssr: false, loading: () => <div className="animate-pulse h-[250px] bg-muted rounded-xl" /> }
);
const VocabGrowthChart = dynamic(
  () => import("@/components/ReportCharts").then((m) => m.VocabGrowthChart),
  { ssr: false, loading: () => <div className="animate-pulse h-[250px] bg-muted rounded-xl" /> }
);

// ── 周期标签 ──

const PERIOD_LABELS: Record<ReportPeriodType, string> = {
  week: "本周",
  month: "本月",
  custom: "自定义",
};

// ── 简单 Markdown 渲染 ──

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ### 标题
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold mt-4 mb-2 first:mt-0">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // ## 标题
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold mt-5 mb-2 first:mt-0">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // 空行
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-3" />);
      i++;
      continue;
    }

    // 列表项
    if (line.trim().startsWith("- ")) {
      const content = parseInlineMarkdown(line.trim().slice(2));
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {content}
        </li>
      );
      i++;
      continue;
    }

    // 普通段落
    elements.push(
      <p key={i} className="text-sm leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="prose-content">{elements}</div>;
}

/** 解析行内 markdown：**粗体** */
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── 格式化日期范围 ──

function formatDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const fmt = (d: Date) => {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

// ── Style 标签映射 ──

const STYLE_LABELS: Record<string, string> = {
  academic: "学术",
  business: "商务",
  daily: "日常",
};

const STYLE_COLORS: Record<string, string> = {
  academic: "bg-primary/10 text-primary dark:bg-accent/20 dark:text-[#ABD1C6]",
  business: "bg-accent/30 text-[#312F2C] dark:bg-accent/15 dark:text-[#ABD1C6]",
  daily: "bg-primary/5 text-primary/70 dark:bg-accent/10 dark:text-[#ABD1C6]/70",
};

// ══════════════════════════════════════
// 主组件
// ══════════════════════════════════════

export default function ReportView() {
  const { data: session, status } = useSession();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI 评语状态
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // 身份检查
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  // 获取报告数据
  const fetchReport = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("period", periodType);
      if (periodType === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }

      const res = await fetch(`/api/report?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "加载失败");
      }

      const data: ReportData = await res.json();
      setReportData(data);
      // 切换周期时清除旧的 AI 评语
      setInsights(null);
      setInsightsError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [periodType, customStart, customEnd, status]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // 生成 AI 学习总结
  const handleGenerateInsights = async () => {
    if (!reportData) return;

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const res = await fetch("/api/report/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("今日免费次数已用完");
        }
        throw new Error(body.error || "生成失败");
      }

      setInsights(body.insights);
      toast.success(`AI 总结已生成（今日剩余 ${body.remaining} 次）`);
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── 加载状态 ──
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-5 bg-muted rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ── 错误状态 ──
  if (error || !reportData) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">加载失败</h2>
        <p className="text-muted-foreground mb-4">{error || "暂无数据"}</p>
        <Button onClick={fetchReport} style={getBtnStyle("report:reload")}>重新加载</Button>
      </div>
    );
  }

  // ── 空状态 ──
  const hasActivity =
    reportData.translationStats.total > 0 || reportData.correctionStats.total > 0;

  const periodLabel = PERIOD_LABELS[periodType];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">学习{periodLabel}报</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateRange(reportData.period.startDate, reportData.period.endDate)}
          </p>
        </div>
      </div>

      {/* ── 周期选择器 ── */}
      <div className="flex items-center gap-2 mb-8">
        {(["week", "month"] as ReportPeriodType[]).map((p) => (
          <Button
            key={p}
            variant={periodType === p && !customStart ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setPeriodType(p);
              setCustomStart("");
              setCustomEnd("");
            }}
            style={getBtnStyle(`report:period-${p}`)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {PERIOD_LABELS[p]}
          </Button>
        ))}
        <Button
          key="custom"
          variant={periodType === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodType("custom")}
          style={getBtnStyle("report:period-custom")}
        >
          自定义
        </Button>
      </div>

      {/* 自定义日期范围 */}
      {periodType === "custom" && (
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
          <span className="text-muted-foreground text-sm">至</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" onClick={fetchReport} disabled={!customStart || !customEnd} style={getBtnStyle("report:query")}>
            查询
          </Button>
        </div>
      )}

      {/* ── 空状态 ── */}
      {!hasActivity ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">这段时间还没有学习记录</h3>
            <p className="text-muted-foreground mb-6">
              开始你的第一次练习吧，数据会在这里汇总成学习报告哦 ✨
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => (window.location.href = "/write")} style={getBtnStyle("report:start-write")}>
                <FileText className="mr-2 h-4 w-4" />
                开始翻译
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/correct")} style={getBtnStyle("report:start-correct")}>
                <GraduationCap className="mr-2 h-4 w-4" />
                开始批改
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── 统计卡片 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  翻译次数
                </div>
                <p className="text-3xl font-bold">{reportData.translationStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <GraduationCap className="h-4 w-4" />
                  批改次数
                </div>
                <p className="text-3xl font-bold">{reportData.correctionStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Target className="h-4 w-4" />
                  平均得分
                </div>
                <p className="text-3xl font-bold">
                  {reportData.correctionStats.total > 0
                    ? reportData.correctionStats.averageScore
                    : "--"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  新增词汇
                </div>
                <p className="text-3xl font-bold">{reportData.vocabGrowth.newWords}</p>
              </CardContent>
            </Card>
          </div>

          {/* ── 翻译统计 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <TranslationDailyChart data={reportData.translationStats.dailyCounts} />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">翻译风格分布</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(reportData.translationStats.byStyle).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">暂无翻译数据</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reportData.translationStats.byStyle).map(([style, count]) => (
                      <Badge
                        key={style}
                        variant="secondary"
                        className={`text-sm px-3 py-1.5 ${STYLE_COLORS[style] || ""}`}
                      >
                        {STYLE_LABELS[style] || style} × {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── 批改统计 ── */}
          {reportData.correctionStats.total > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ScoreTrendChart data={reportData.correctionStats.scoreTrend} />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">考试类型分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(reportData.correctionStats.byExamType).map(
                        ([type, count]) => (
                          <Badge key={type} variant="outline" className="text-sm px-3 py-1.5">
                            {type} × {count}
                          </Badge>
                        )
                      )}
                    </div>
                    {reportData.correctionStats.total > 0 && (
                      <p className="text-sm text-muted-foreground mt-4">
                        最高得分：{reportData.correctionStats.maxScore} 分
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ── 语法薄弱点 ── */}
          {reportData.grammarPatterns.length > 0 && (
            <div className="mb-6">
              <GrammarTrendChart data={reportData.grammarPatterns} />
            </div>
          )}

          {/* ── 词汇增长 ── */}
          {(reportData.vocabGrowth.newWords > 0 ||
            reportData.vocabGrowth.newGrammar > 0) && (
            <div className="mb-6">
              <VocabGrowthChart data={reportData.vocabGrowth.dailyAdded} />
            </div>
          )}

          {/* ── AI 学习总结 ── */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI 学习总结
              </CardTitle>
              <CardDescription>
                基于你的学习数据，AI 会生成个性化评价和学习建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!insights && !insightsLoading && (
                <Button
                  onClick={handleGenerateInsights}
                  disabled={insightsLoading}
                  className="w-full sm:w-auto"
                  style={getBtnStyle("report:ai-summary")}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成 AI 学习总结
                </Button>
              )}

              {insightsLoading && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">AI 正在分析你的学习数据...</span>
                </div>
              )}

              {insightsError && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-500 mb-2">{insightsError}</p>
                  <Button variant="outline" size="sm" onClick={handleGenerateInsights} style={getBtnStyle("report:retry")}>
                    重试
                  </Button>
                </div>
              )}

              {insights && (
                <div className="bg-muted/30 rounded-lg p-5">
                  <SimpleMarkdown text={insights} />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
