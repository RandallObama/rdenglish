"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { GrammarExercisesDialog } from "@/components/GrammarExercisesDialog";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  FileText,
  AlertCircle,
  Award,
  Target,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import type {
  GrammarPatternAnalysis,
  GrammarPattern,
} from "@/types";

const levelVariant: Record<string, "secondary" | "default" | "destructive"> = {
  基础: "secondary",
  进阶: "default",
  高级: "destructive",
};

function TrendIcon({ trend }: { trend: GrammarPattern["trend"] }) {
  switch (trend) {
    case "up":
      return (
        <span title="出现频率上升（恶化中）">
          <TrendingUp className="h-4 w-4 text-red-500" />
        </span>
      );
    case "down":
      return (
        <span title="出现频率下降（改善中）">
          <TrendingDown className="h-4 w-4 text-green-500" />
        </span>
      );
    default:
      return (
        <span title="趋势平稳">
          <Minus className="h-4 w-4 text-muted-foreground" />
        </span>
      );
  }
}

export function GrammarPatternsView() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [analysis, setAnalysis] = useState<GrammarPatternAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"count" | "name" | "trend">("count");
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [exercisesOpen, setExercisesOpen] = useState(false);

  // 获取分析数据
  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grammar-patterns");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "加载失败");
        return;
      }
      const data: GrammarPatternAnalysis = await res.json();
      setAnalysis(data);
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchAnalysis();
    }
  }, [status, router, fetchAnalysis]);

  // 前端排序 & 过滤
  const filteredPatterns = useMemo(() => {
    if (!analysis) return [];

    let list = [...analysis.patterns];

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.point.toLowerCase().includes(q));
    }

    // 排序
    const trendOrder: Record<string, number> = { up: 2, stable: 1, down: 0 };
    list.sort((a, b) => {
      switch (sortBy) {
        case "count":
          return b.count - a.count;
        case "name":
          return a.point.localeCompare(b.point, "zh");
        case "trend":
          return trendOrder[b.trend] - trendOrder[a.trend];
        default:
          return 0;
      }
    });

    return list;
  }, [analysis, searchQuery, sortBy]);

  // 勾选/取消语法点
  function togglePoint(point: string) {
    setSelectedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(point)) {
        next.delete(point);
      } else {
        next.add(point);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedPoints(new Set());
    setExercisesOpen(false);
  }

  // loading / unauthenticated
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  // 空状态：没有批改记录
  if (analysis && analysis.totalCorrections === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center py-16">
          <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-bold mb-2">还没有批改记录</h2>
          <p className="text-muted-foreground mb-6">
            完成至少一次作文批改后，这里将显示你的语法薄弱点分析
          </p>
          <Button onClick={() => router.push("/correct")}>
            去批改一篇作文
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 标题 */}
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">语法病历本</h1>
          <p className="text-muted-foreground text-sm mt-1">
            基于 {analysis.totalCorrections} 次批改记录分析你的语法薄弱点
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              分析批改数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analysis.totalCorrections}</p>
            <p className="text-xs text-muted-foreground mt-1">次批改记录</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              语法问题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analysis.totalIssues}</p>
            <p className="text-xs text-muted-foreground mt-1">个语法问题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              薄弱语法点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analysis.uniquePoints}</p>
            <p className="text-xs text-muted-foreground mt-1">种不同类型</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              最常犯错
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold line-clamp-1">
              {analysis.topPattern || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.topPatternCount > 0
                ? `出现 ${analysis.topPatternCount} 次`
                : "暂无数据"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索与排序栏 */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索语法点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as typeof sortBy)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">按次数</SelectItem>
            <SelectItem value="name">按名称</SelectItem>
            <SelectItem value="trend">按趋势</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="default"
          disabled={selectedPoints.size === 0}
          onClick={() => setExercisesOpen(true)}
        >
          <Dumbbell className="mr-2 h-4 w-4" />
          生成练习
          {selectedPoints.size > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedPoints.size}
            </Badge>
          )}
        </Button>
      </div>

      {/* 语法点列表 */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">没有匹配的语法点</p>
          {searchQuery && (
            <button
              className="text-sm text-primary mt-1 hover:underline"
              onClick={() => setSearchQuery("")}
            >
              清除搜索
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPatterns.map((pattern) => {
            const isSelected = selectedPoints.has(pattern.point);
            return (
              <Card
                key={pattern.point}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "ring-2 ring-primary/40 bg-primary/5"
                    : "hover:bg-muted/30"
                }`}
                onClick={() => togglePoint(pattern.point)}
              >
                <CardContent className="p-4">
                  <CollapsibleSection
                    summary={
                      <div className="flex items-center gap-3 w-full">
                        {/* 勾选指示 */}
                        <div
                          className={`h-5 w-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>

                        {/* 语法点名 */}
                        <span className="font-medium text-sm flex-1 line-clamp-1">
                          {pattern.point}
                        </span>

                        {/* 难度 Badge */}
                        <div className="flex gap-1 flex-shrink-0">
                          {pattern.levels.slice(0, 2).map((lv) => (
                            <Badge
                              key={lv}
                              variant={levelVariant[lv] || "secondary"}
                              className="text-[10px]"
                            >
                              {lv}
                            </Badge>
                          ))}
                        </div>

                        {/* 次数 */}
                        <span className="text-sm font-bold text-primary flex-shrink-0 w-12 text-right">
                          {pattern.count}
                          <span className="text-xs font-normal text-muted-foreground">
                            次
                          </span>
                        </span>

                        {/* 趋势 */}
                        <span className="flex-shrink-0">
                          <TrendIcon trend={pattern.trend} />
                        </span>
                      </div>
                    }
                    className="mt-0"
                  >
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {/* 统计信息 */}
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>
                          首次：{new Date(pattern.firstOccurred).toLocaleDateString("zh-CN")}
                        </span>
                        <span>
                          最近：{new Date(pattern.lastOccurred).toLocaleDateString("zh-CN")}
                        </span>
                        <span>跨度：{pattern.totalSpan} 天</span>
                        <span>月均：{pattern.avgPerMonth} 次</span>
                      </div>

                      {/* 典型错误示例 */}
                      {pattern.sampleMistakes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            典型错误示例：
                          </p>
                          <div className="space-y-2">
                            {pattern.sampleMistakes.map((m, i) => (
                              <div
                                key={i}
                                className="bg-red-50 dark:bg-red-950/30 rounded p-2"
                              >
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  ❌ 错误：{m.error}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  ✅ 正确：{m.correction}
                                </p>
                                <p className="text-xs text-muted-foreground border-t border-red-200 dark:border-red-800 pt-1.5 mt-1">
                                  💡 {m.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 练习题弹窗 */}
      <GrammarExercisesDialog
        open={exercisesOpen}
        onOpenChange={setExercisesOpen}
        selectedPoints={[...selectedPoints].slice(0, 5)}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
