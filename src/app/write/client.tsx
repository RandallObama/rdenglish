"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Writer } from "@/components/Writer";
import { FeatureGuide } from "@/components/FeatureGuide";
import { PenLine, ScanEye, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { GrammarNote, VocabNote } from "@/types";

const ResultCard = dynamic(
  () => import("@/components/ResultCard").then((m) => m.ResultCard),
  {
    loading: () => (
      <div className="animate-pulse mt-6 space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    ),
  }
);

export default function WriteClient() {
  const [result, setResult] = useState<{
    id: string;
    english: string;
    grammarNotes: GrammarNote[];
    vocabNotes: VocabNote[];
    remaining: number;
  } | null>(null);

  const handleResult = useCallback(
    (data: {
      id: string;
      english: string;
      grammarNotes: GrammarNote[];
      vocabNotes: VocabNote[];
      remaining: number;
    }) => {
      setResult(data);
      toast.success("翻译完成！");
    },
    []
  );

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">写作翻译</h1>
      </div>

      <FeatureGuide
        featureKey="write"
        title="写作翻译 — 使用指南"
        description="输入中文，AI 智能翻译成地道英文，并标注语法和词汇要点"
        steps={[
          {
            icon: <PenLine className="h-3 w-3" />,
            text: "在输入框中输入你想翻译的中文内容，可选择写作风格（日常/学术/商务）和目标考试级别",
          },
          {
            icon: <Wand2 className="h-3 w-3" />,
            text: "输入过程中可点击「AI 续写」让 AI 帮你扩展思路，从多个续写建议中选择一个继续",
          },
          {
            icon: <ScanEye className="h-3 w-3" />,
            text: "点击「开始翻译与分析」，AI 会生成地道英文译文，并标注语法要点和词汇用法笔记",
          },
        ]}
        tips={[
          "写作风格和考试级别会影响译文的用词难度和句式复杂度",
          "AI 续写功能适合写作卡壳时获取灵感，建议一次生成后挑选最合适的续写方向",
          "翻译结果中的语法要点和词汇笔记都可以收藏，方便日后复习",
        ]}
      />

      <Writer onResult={handleResult} onError={handleError} />

      {result && (
        <ResultCard
          resultId={result.id}
          english={result.english}
          grammarNotes={result.grammarNotes}
          vocabNotes={result.vocabNotes}
          remaining={result.remaining}
        />
      )}
    </div>
  );
}
