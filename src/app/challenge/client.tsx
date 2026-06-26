"use client";

import { Suspense } from "react";
import { ChallengeView } from "@/components/ChallengeView";
import { BackButton } from "@/components/BackButton";

export function ChallengeClient() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        }
      >
        <ChallengeView />
      </Suspense>
    </div>
  );
}
