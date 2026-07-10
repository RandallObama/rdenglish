"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Optimizer } from "@/components/Optimizer";
import { OptimizeResult } from "@/components/OptimizeResult";
import { FeatureGuide } from "@/components/FeatureGuide";
import { FileText, Sliders, Gauge, Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { GrammarNote, VocabNote, ImprovementItem, TransitionAnalysis } from "@/types";

export default function OptimizeClient() {
  const [result, setResult] = useState<{
    id: string;
    optimizedText: string;
    improvements: ImprovementItem[];
    grammarNotes: GrammarNote[];
    vocabNotes: VocabNote[];
    highlights: string;
    transitionAnalysis?: TransitionAnalysis;
    remaining: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view");

  // 支持 ?view=xxx 加载历史记录详情
  useEffect(() => {
    if (!viewId) return;
    let cancelled = false;
    setLoadingView(true);

    fetch(`/api/optimize/${viewId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "加载失败" }));
          throw new Error(err.error || "加载失败");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setErrorMsg(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message || "加载优化记录失败");
          toast.error(err.message || "加载优化记录失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingView(false);
      });

    return () => { cancelled = true; };
  }, [viewId]);

  const handleResult = useCallback(
    (data: {
      id: string;
      optimizedText: string;
      improvements: ImprovementItem[];
      grammarNotes: GrammarNote[];
      vocabNotes: VocabNote[];
      highlights: string;
      transitionAnalysis?: TransitionAnalysis;
      remaining: number;
    }) => {
      setResult(data);
      setErrorMsg(null);
      toast.success("优化完成！");
    },
    []
  );

  const handleError = useCallback((error: string) => {
    setErrorMsg(error);
    toast.error(error);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">写作优化</h1>
      </div>

      <FeatureGuide
        featureKey="optimize"
        title="写作优化 — 使用指南"
        description="提交英文文本，AI 从内容、语法、逻辑、结构全方位优化改写"
        steps={[
          {
            icon: <FileText className="h-3 w-3" />,
            text: "在输入框中粘贴或输入你的英文文本，选择写作风格（日常/学术/商务/创意/议论文）和目标考试级别",
          },
          {
            icon: <Sliders className="h-3 w-3" />,
            text: "选择优化力度：轻度（仅纠正语法拼写）、中度（语法+词汇+逻辑）、深度（全方位改写提升）",
          },
          {
            icon: <Scissors className="h-3 w-3" />,
            text: "也可以选中文本片段进行局部优化，AI 会自动将优化后的片段衔接回原文",
          },
          {
            icon: <Gauge className="h-3 w-3" />,
            text: "点击提交，AI 会从内容、语法、词汇、逻辑、结构五个维度进行优化，并给出改进对照和语法词汇笔记",
          },
        ]}
        tips={[
          "深度优化会大幅改写原文，适合想要全面提升的场景；轻度优化只纠正错误，适合快速检查",
          "片段优化适合只对某个段落不满意的情况，优化结果会自动替换原选区",
          "优化结果中的「亮点总结」帮你快速了解 AI 做了哪些关键改进",
        ]}
      />

      <Optimizer onResult={handleResult} onError={handleError} />

      {loadingView && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">优化失败</p>
          <p className="text-sm text-red-600 dark:text-red-500">{errorMsg}</p>
          <p className="text-xs text-red-400 dark:text-red-600 mt-2">
            请尝试：缩短文本、更换优化力度/风格，或稍后重试。如持续失败请联系管理员。
          </p>
        </div>
      )}

      {result && (
        <OptimizeResult
          resultId={result.id}
          optimizedText={result.optimizedText}
          improvements={result.improvements}
          grammarNotes={result.grammarNotes}
          vocabNotes={result.vocabNotes}
          highlights={result.highlights}
          transitionAnalysis={result.transitionAnalysis}
          remaining={result.remaining}
        />
      )}
    </div>
  );
}
