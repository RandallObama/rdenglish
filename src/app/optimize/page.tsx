"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Optimizer } from "@/components/Optimizer";
import { OptimizeResult } from "@/components/OptimizeResult";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { GrammarNote, VocabNote, ImprovementItem, TransitionAnalysis } from "@/types";

export default function OptimizePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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
      toast.success("优化完成！");
    },
    []
  );

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">写作优化</h1>
        <p className="text-muted-foreground text-sm mt-1">
          提交英文文本，AI 根据语言风格和考试标准，从内容、语法、逻辑、结构全方位优化改写
        </p>
      </div>

      <Optimizer onResult={handleResult} onError={handleError} />

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
