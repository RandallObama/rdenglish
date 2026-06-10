"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SaveButtonProps {
  type: "word" | "grammar";
  data: Record<string, unknown>;
  source: "translate" | "correct" | "history";
  size?: "sm" | "default";
}

export function SaveButton({ type, data, source, size = "sm" }: SaveButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);

    try {
      const endpoint =
        type === "word"
          ? "/api/notebook/word"
          : "/api/notebook/grammar";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source }),
      });

      if (res.ok) {
        setSaved(true);
        toast.success(
          type === "word" ? "已收藏到生词本" : "已收藏到语法笔记本"
        );
      } else {
        const err = await res.json();
        toast.error(err.error || "收藏失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant={saved ? "secondary" : "ghost"}
      size={size === "sm" ? "icon" : "default"}
      onClick={handleSave}
      disabled={saving || saved}
      className={saved ? "text-green-600 dark:text-green-400" : ""}
      title={saved ? "已收藏" : "收藏"}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}
