"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, BookOpen, Lightbulb, Clock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { WritingRecord } from "@/types";

const styleLabels: Record<string, string> = {
  daily: "日常",
  academic: "学术",
  business: "商务",
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<WritingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchHistory();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
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
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">历史记录</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查看你之前的翻译记录
          </p>
        </div>
        <Link href="/write" className={buttonVariants({ size: "sm" })}>
          新建翻译
        </Link>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无记录</h3>
            <p className="text-muted-foreground text-sm mb-4">
              开始你的第一次翻译吧
            </p>
            <Link href="/write" className={buttonVariants()}>
              开始写作
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {record.sourceText}
                    </p>
                    <p className="text-base line-clamp-3 whitespace-pre-wrap">
                      {record.resultText}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleDelete(record.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {styleLabels[record.style] || record.style}
                  </Badge>
                  {record.grammarNotes.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lightbulb className="h-3 w-3" />
                      {record.grammarNotes.length} 个语法点
                    </Badge>
                  )}
                  {record.vocabNotes.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <BookOpen className="h-3 w-3" />
                      {record.vocabNotes.length} 个词汇
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>

                {/* 展开查看详情 */}
                <Tabs defaultValue="result" className="mt-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="result" className="text-xs h-7">
                      翻译
                    </TabsTrigger>
                    {record.grammarNotes.length > 0 && (
                      <TabsTrigger value="grammar" className="text-xs h-7">
                        语法
                      </TabsTrigger>
                    )}
                    {record.vocabNotes.length > 0 && (
                      <TabsTrigger value="vocab" className="text-xs h-7">
                        词汇
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="result" className="mt-2">
                    <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                      {record.resultText}
                    </p>
                  </TabsContent>
                  <TabsContent value="grammar" className="mt-2 space-y-2">
                    {record.grammarNotes.map((note, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {note.point}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {note.explanation}
                        </p>
                        {note.examples && note.examples.length > 0 && (
                          <p className="text-xs italic mt-1 text-muted-foreground">
                            {note.examples[0]}
                          </p>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="vocab" className="mt-2 space-y-2">
                    {record.vocabNotes.map((note, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <span className="font-semibold text-sm">
                          {note.word}
                        </span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {note.chinese}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {note.usage}
                        </p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
