"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { EssayCorrector } from "@/components/EssayCorrector";
import { FeatureGuide } from "@/components/FeatureGuide";
import { FileText, GraduationCap, BarChart3, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { CorrectionResult as CorrectionResultType } from "@/types";

const CorrectionResult = dynamic(
  () => import("@/components/CorrectionResult").then((m) => m.CorrectionResult),
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

export default function CorrectClient() {
  const [result, setResult] = useState<
    (CorrectionResultType & { id?: string; remaining: number }) | null
  >(null);

  const handleResult = useCallback(
    (data: CorrectionResultType & { id?: string; remaining: number }) => {
      setResult(data);
      toast.success("批改完成！");
    },
    []
  );

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">文章批改</h1>
      </div>

      <FeatureGuide
        featureKey="correct"
        title="文章批改 — 使用指南"
        description="提交英语作文，按考试标准智能评分并给出逐句批注"
        steps={[
          {
            icon: <FileText className="h-3 w-3" />,
            text: "在输入框中粘贴你的英语作文，选择目标考试级别（中考/高考/四级/六级/雅思/通用）",
          },
          {
            icon: <GraduationCap className="h-3 w-3" />,
            text: "点击「提交批改」，AI 会按照所选考试的评分标准进行全面评估",
          },
          {
            icon: <BarChart3 className="h-3 w-3" />,
            text: "查看总分与四个维度的详细评分（内容、结构、语法、词汇），每个维度都有具体分数和评语",
          },
          {
            icon: <ListChecks className="h-3 w-3" />,
            text: "查看逐句批注、语法问题、词汇建议和优化建议，对照修改自己的作文",
          },
        ]}
        tips={[
          "选择正确的考试级别很重要——不同考试的评分标准差异很大（如四级满分15，雅思满分9）",
          "逐句批注会标出每句话的具体问题，是提升写作最有效的参考",
          "批改结果中的优化建议可以直接复制，作为改写的参考方向",
        ]}
      />

      <EssayCorrector onResult={handleResult} onError={handleError} />

      {result && (
        <CorrectionResult result={result} remaining={result.remaining} correctionId={result.id} />
      )}
    </div>
  );
}
