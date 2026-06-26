"use client";

import { BackButton } from "@/components/BackButton";
import { ChallengeReviewPanel } from "@/components/ChallengeReviewPanel";

export function ReviewClient() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <ChallengeReviewPanel />
    </div>
  );
}
