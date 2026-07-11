"use client";

import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotebookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <FileQuestion className="size-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">笔记本加载出错</h1>
      <p className="max-w-md text-muted-foreground text-sm">
        抱歉，加载笔记本时遇到了问题。请稍后再试。
      </p>
      {error.message && (
        <p className="max-w-md text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 font-mono break-all">
          {error.message}
        </p>
      )}
      <Button onClick={reset} variant="default">
        重试
      </Button>
    </div>
  );
}
