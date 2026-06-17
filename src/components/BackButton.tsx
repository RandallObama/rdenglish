"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all py-1.5 px-4 rounded-full border-2 border-muted-foreground/15"
    >
      <ArrowLeft className="h-4 w-4" />
      返回
    </button>
  );
}
