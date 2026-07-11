"use client";

import { useEffect, useState, useCallback } from "react";
import { NotebookList } from "@/components/NotebookList";
import type { TransferWord } from "@/components/NotebookList";
import { TransferToWordbookDialog } from "@/components/TransferToWordbookDialog";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { SavedWordItem, SavedGrammarItem } from "@/types";

export default function NotebookClient() {
  const [words, setWords] = useState<SavedWordItem[]>([]);
  const [grammars, setGrammars] = useState<SavedGrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferWords, setTransferWords] = useState<TransferWord[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wordsRes, grammarsRes] = await Promise.all([
        fetch("/api/notebook/word"),
        fetch("/api/notebook/grammar"),
      ]);

      // 检查是否有请求失败
      const errors: string[] = [];
      if (wordsRes.ok) {
        setWords(await wordsRes.json());
      } else {
        const data = await wordsRes.json().catch(() => ({ error: "请求失败" }));
        errors.push(data.error || "生词加载失败");
      }
      if (grammarsRes.ok) {
        setGrammars(await grammarsRes.json());
      } else {
        const data = await grammarsRes.json().catch(() => ({ error: "请求失败" }));
        errors.push(data.error || "语法加载失败");
      }
      if (errors.length > 0) {
        setError(errors.join("；"));
        toast.error(errors[0]);
      }
    } catch {
      setError("网络错误，请检查网络后重试");
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteWord = async (id: string) => {
    try {
      const res = await fetch(`/api/notebook/word/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWords((prev) => prev.filter((w) => w.id !== id));
        toast.success("已删除");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleDeleteGrammar = async (id: string) => {
    try {
      const res = await fetch(`/api/notebook/grammar/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGrammars((prev) => prev.filter((g) => g.id !== id));
        toast.success("已删除");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && words.length === 0 && grammars.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">我的笔记本</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">加载失败</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            <RefreshCw className="h-4 w-4" /> 重试
          </button>
        </div>
      </div>
    );
  }

  const handleTransferWords = useCallback((wordsToTransfer: TransferWord[]) => {
    setTransferWords(wordsToTransfer);
    setTransferOpen(true);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">我的笔记本</h1>
      <NotebookList
        words={words}
        grammars={grammars}
        onDeleteWord={handleDeleteWord}
        onDeleteGrammar={handleDeleteGrammar}
        onTransferWords={handleTransferWords}
      />
      <TransferToWordbookDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        words={transferWords}
        onSuccess={() => {
          toast.success("单词已成功转移到单词本");
        }}
      />
    </div>
  );
}
