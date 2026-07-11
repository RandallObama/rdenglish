"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Crown, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";
import type { WordbookItem } from "@/types";

interface TransferWord {
  word: string;
  chinese: string;
  phoneticUK?: string;
  phoneticUS?: string;
  level?: string;
  usage?: string;
}

interface TransferToWordbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: TransferWord[];
  onSuccess?: () => void;
}

export function TransferToWordbookDialog({
  open,
  onOpenChange,
  words,
  onSuccess,
}: TransferToWordbookDialogProps) {
  const [wordbooks, setWordbooks] = useState<WordbookItem[]>([]);
  const [loadingWbs, setLoadingWbs] = useState(false);
  const [selectedWbId, setSelectedWbId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // 加载用户的单词本列表
  useEffect(() => {
    if (!open) return;
    setSelectedWbId(null);
    setProgress({ done: 0, total: 0 });
    setLoadingWbs(true);
    fetch("/api/wordbooks")
      .then((res) => res.json())
      .then((data) => {
        setWordbooks(data.wordbooks || []);
      })
      .catch(() => {
        toast.error("加载单词本列表失败");
      })
      .finally(() => setLoadingWbs(false));
  }, [open]);

  const handleTransfer = async () => {
    if (!selectedWbId || words.length === 0) return;
    setTransferring(true);
    setProgress({ done: 0, total: words.length });

    // 尝试批量 API
    try {
      const res = await fetch(`/api/wordbooks/${selectedWbId}/words/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: words.map((w) => ({
            word: w.word,
            chinese: w.chinese,
            phoneticUK: w.phoneticUK || undefined,
            phoneticUS: w.phoneticUS || undefined,
            level: w.level || undefined,
            usage: w.usage || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `已添加 ${data.added} 个单词` +
            (data.skipped > 0 ? `，${data.skipped} 个已存在跳过` : "")
        );
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      // 批量 API 失败则 fallback 到逐条
      console.warn("批量 API 不可用，回退到逐条添加:", data.error);
    } catch {
      // fallback
    }

    // 逐条 fallback
    let added = 0;
    let skipped = 0;
    for (let i = 0; i < words.length; i++) {
      try {
        const res = await fetch(`/api/wordbooks/${selectedWbId}/words`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: words[i].word,
            chinese: words[i].chinese,
            phoneticUK: words[i].phoneticUK || undefined,
            phoneticUS: words[i].phoneticUS || undefined,
            level: words[i].level || undefined,
            usage: words[i].usage || undefined,
          }),
        });
        if (res.ok) {
          added++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
      setProgress({ done: i + 1, total: words.length });
    }

    if (added > 0) {
      toast.success(
        `已添加 ${added} 个单词` +
          (skipped > 0 ? `，${skipped} 个失败` : "")
      );
    } else {
      toast.error("转移失败，请稍后重试");
    }

    if (added > 0) {
      onSuccess?.();
      onOpenChange(false);
    }
    setTransferring(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            转移到单词本
          </DialogTitle>
          <DialogDescription>
            {words.length === 1
              ? `将「${words[0].word}」复制到以下单词本`
              : `将 ${words.length} 个单词复制到以下单词本`}
          </DialogDescription>
        </DialogHeader>

        {loadingWbs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : wordbooks.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              你还没有单词本，请先创建一个
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                // 导航到单词本页面
                window.location.href = "/wordbooks";
              }}
              style={getBtnStyle("transfer:create-wb")}
            >
              去创建单词本
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {wordbooks.map((wb) => (
              <button
                key={wb.id}
                onClick={() => setSelectedWbId(wb.id)}
                disabled={transferring}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedWbId === wb.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate flex items-center gap-1.5">
                    {wb.name}
                    {wb.isOwner && (
                      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {wb.wordCount} 个单词 · {wb.memberCount} 位成员
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {transferring && progress.total > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            正在转移... {progress.done}/{progress.total}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transferring}
          >
            取消
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedWbId || words.length === 0 || transferring}
            style={getBtnStyle("transfer:confirm")}
          >
            {transferring ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            转移{words.length > 1 ? ` (${words.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
