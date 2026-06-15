"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertTriangle className="size-16 text-destructive" />
      <h1 className="text-2xl font-bold">出错了</h1>
      <p className="max-w-md text-muted-foreground">
        页面遇到了一些问题，请尝试刷新。如果问题持续存在，请联系我们。
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>重试</Button>
        <ButtonLink href="/" variant="outline">
          返回首页
        </ButtonLink>
      </div>
    </div>
  );
}
