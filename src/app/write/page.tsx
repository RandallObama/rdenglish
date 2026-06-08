"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Writer } from "@/components/Writer";
import { ResultCard } from "@/components/ResultCard";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { GrammarNote, VocabNote } from "@/types";

export default function WritePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  // 加载中
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 未登录
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">写作翻译</h1>
        <p className="text-muted-foreground text-sm mt-1">
          输入中文，智能翻译成地道英文，并标注语法和词汇要点
        </p>
      </div>

      <Writer onResult={handleResult} onError={handleError} />

      {result && (
        <ResultCard
          english={result.english}
          grammarNotes={result.grammarNotes}
          vocabNotes={result.vocabNotes}
          remaining={result.remaining}
        />
      )}
    </div>
  );
}
