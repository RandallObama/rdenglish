"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { EssayCorrector } from "@/components/EssayCorrector";
import { CorrectionResult } from "@/components/CorrectionResult";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CorrectionResult as CorrectionResultType } from "@/types";

export default function CorrectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [result, setResult] = useState<
    (CorrectionResultType & { remaining: number }) | null
  >(null);

  const handleResult = useCallback(
    (data: CorrectionResultType & { remaining: number }) => {
      setResult(data);
      toast.success("批改完成！");
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
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">文章批改</h1>
        <p className="text-muted-foreground text-sm mt-1">
          提交英语作文，按考试标准智能评分并给出逐句批注和语法词汇分析
        </p>
      </div>

      <EssayCorrector onResult={handleResult} onError={handleError} />

      {result && (
        <CorrectionResult result={result} remaining={result.remaining} />
      )}
    </div>
  );
}
