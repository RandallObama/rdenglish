"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NotebookList } from "@/components/NotebookList";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SavedWordItem, SavedGrammarItem } from "@/types";

export default function NotebookPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [words, setWords] = useState<SavedWordItem[]>([]);
  const [grammars, setGrammars] = useState<SavedGrammarItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [wordsRes, grammarsRes] = await Promise.all([
        fetch("/api/notebook/word"),
        fetch("/api/notebook/grammar"),
      ]);

      if (wordsRes.ok) setWords(await wordsRes.json());
      if (grammarsRes.ok) setGrammars(await grammarsRes.json());
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, fetchData]);

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

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">我的笔记本</h1>
      <NotebookList
        words={words}
        grammars={grammars}
        onDeleteWord={handleDeleteWord}
        onDeleteGrammar={handleDeleteGrammar}
      />
    </div>
  );
}
