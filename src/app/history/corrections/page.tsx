"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, GraduationCap, FileCheck, Lightbulb, BookOpen, Sparkles, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { CorrectionRecord, ExamType } from "@/types";

const examLabels: Record<ExamType, string> = {
  general: "通用",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
};

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

export default function CorrectionHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/correct");
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
      const res = await fetch(`/api/correct/${id}`, { method: "DELETE" });
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
          <h1 className="text-xl sm:text-2xl font-bold">批改记录</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查看你之前的作文批改记录
          </p>
        </div>
        <Link href="/correct" className={buttonVariants({ size: "sm" })}>
          新建批改
        </Link>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无批改记录</h3>
            <p className="text-muted-foreground text-sm mb-4">
              提交你的第一篇英语作文吧
            </p>
            <Link href="/correct" className={buttonVariants()}>
              开始批改
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
                    {/* 分数 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        {record.totalScore}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{record.maxScore}
                      </span>
                    </div>
                    {/* 作文摘要 */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {record.essayText}
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
                    {examLabels[record.examType as ExamType] || record.examType}
                  </Badge>
                  {record.sentenceCorrections.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <FileCheck className="h-3 w-3" />
                      {record.sentenceCorrections.length} 条批注
                    </Badge>
                  )}
                  {record.grammarIssues.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lightbulb className="h-3 w-3" />
                      {record.grammarIssues.length} 个语法
                    </Badge>
                  )}
                  {record.vocabSuggestions.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <BookOpen className="h-3 w-3" />
                      {record.vocabSuggestions.length} 个词汇
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>

                {/* 展开查看详情 */}
                <Tabs defaultValue="comment" className="mt-3">
                  <TabsList className="h-8 flex-wrap">
                    <TabsTrigger value="comment" className="text-xs h-7 gap-1">
                      <MessageSquareText className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">总评</span>
                    </TabsTrigger>
                    {record.sentenceCorrections.length > 0 && (
                      <TabsTrigger value="sentences" className="text-xs h-7 gap-1">
                        <FileCheck className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline">逐句</span>
                        ({record.sentenceCorrections.length})
                      </TabsTrigger>
                    )}
                    {record.grammarIssues.length > 0 && (
                      <TabsTrigger value="grammar" className="text-xs h-7 gap-1">
                        <Lightbulb className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline">语法</span>
                        ({record.grammarIssues.length})
                      </TabsTrigger>
                    )}
                    {record.vocabSuggestions.length > 0 && (
                      <TabsTrigger value="vocab" className="text-xs h-7 gap-1">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline">词汇</span>
                        ({record.vocabSuggestions.length})
                      </TabsTrigger>
                    )}
                    {record.improvementSuggestions.length > 0 && (
                      <TabsTrigger value="improvement" className="text-xs h-7 gap-1">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline">优化</span>
                        ({record.improvementSuggestions.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="comment" className="mt-2">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium">分项得分</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="text-center bg-background rounded-lg p-2">
                          <p className="text-lg font-bold text-primary">{record.scores.content}</p>
                          <p className="text-xs text-muted-foreground">内容</p>
                        </div>
                        <div className="text-center bg-background rounded-lg p-2">
                          <p className="text-lg font-bold text-primary">{record.scores.structure}</p>
                          <p className="text-xs text-muted-foreground">结构</p>
                        </div>
                        <div className="text-center bg-background rounded-lg p-2">
                          <p className="text-lg font-bold text-primary">{record.scores.grammar}</p>
                          <p className="text-xs text-muted-foreground">语法</p>
                        </div>
                        <div className="text-center bg-background rounded-lg p-2">
                          <p className="text-lg font-bold text-primary">{record.scores.vocabulary}</p>
                          <p className="text-xs text-muted-foreground">词汇</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {record.overallComment}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="sentences" className="mt-2 space-y-2">
                    {record.sentenceCorrections.map((sc, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                          {sc.revised !== sc.original && (
                            <Badge variant="outline" className="text-xs text-green-600">有修改</Badge>
                          )}
                        </div>
                        <p className="text-sm">{sc.original}</p>
                        {sc.revised !== sc.original && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            → {sc.revised}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">{sc.comment}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="grammar" className="mt-2 space-y-2">
                    {record.grammarIssues.map((note, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold text-sm">{note.point}</span>
                          <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">
                            {note.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{note.explanation}</p>
                        {note.examples && note.examples.length > 0 && (
                          <p className="text-xs italic mt-1.5 text-muted-foreground border-l-2 border-primary/20 pl-2">
                            {note.examples[0]}
                          </p>
                        )}
                        {note.commonMistakes && note.commonMistakes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {note.commonMistakes.map((m, j) => (
                              <div key={j} className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                                <p className="text-xs text-red-600">❌ {m.error}</p>
                                <p className="text-xs text-green-600">✅ {m.correction}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="vocab" className="mt-2 space-y-2">
                    {record.vocabSuggestions.map((note, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold text-sm text-primary">{note.word}</span>
                          <Badge variant="outline" className="text-xs">{note.chinese}</Badge>
                          <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">{note.level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{note.usage}</p>
                        {note.collocations && note.collocations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {note.collocations.map((c, j) => (
                              <Badge key={j} variant="secondary" className="text-xs font-mono">{c}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="improvement" className="mt-2 space-y-2">
                    {record.improvementSuggestions.map((item, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{item.suggestion}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                        </div>
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
