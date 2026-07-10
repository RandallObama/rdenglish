"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { SaveButton } from "@/components/SaveButton";
import { Separator } from "@/components/ui/separator";
import { Loader2, Trash2, GraduationCap, FileCheck, Lightbulb, BookOpen, Sparkles, MessageSquareText, ChevronDown, ChevronUp, Link2, ArrowLeftRight, AlertTriangle, Target, ListChecks, XCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ShareDialog } from "@/components/ShareDialog";
import { getBtnStyle } from "@/lib/button-colors";
import type { CorrectionRecord, ExamType, ShareContentType } from "@/types";

const examLabels: Record<ExamType, string> = {
  general: "通用",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  literary: "文学批评",
};

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

const PAGE_SIZE = 10;

export default function CorrectionHistoryClient() {
  const [records, setRecords] = useState<CorrectionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: ShareContentType } | null>(null);

  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    const setLoadingState = append ? setLoadingMore : setLoading;
    setLoadingState(true);
    try {
      const res = await fetch(`/api/correct?page=${pageNum}&pageSize=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setRecords((prev) => [...prev, ...data.items]);
        } else {
          setRecords(data.items);
        }
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast.error("加载失败");
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

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

  const handleLoadMore = () => {
    fetchHistory(page + 1, true);
  };

  if (loading) {
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
        <div className="flex items-center gap-2">
          <Link href="/history" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <FileCheck className="h-4 w-4 mr-1" />
            翻译记录
          </Link>
          <Link href="/history/optimizations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Sparkles className="h-4 w-4 mr-1" />
            优化记录
          </Link>
          <Link href="/correct" className={buttonVariants({ size: "sm" })} style={getBtnStyle("history:new-correct")}>
            新建批改
          </Link>
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无批改记录</h3>
            <p className="text-muted-foreground text-sm mb-4">
              提交你的第一篇英语作文吧
            </p>
            <Link href="/correct" className={buttonVariants()} style={getBtnStyle("history:start-correct")}>
              开始批改
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
              <Card key={record.id} className={isExpanded ? "ring-1 ring-primary/20" : ""}>
                <CardContent className="p-4">
                  <div
                    className="flex items-start justify-between gap-4 mb-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : record.id);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-primary">
                          {record.totalScore}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{record.maxScore}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {examLabels[record.examType as ExamType] || record.examType}
                        </Badge>
                      </div>
                      <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}>
                        {record.essayText}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareTarget({ id: record.id, type: "correction" });
                        }}
                      >
                        <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {record.sentenceCorrections?.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileCheck className="h-3 w-3" />
                        {record.sentenceCorrections.length} 句批注
                      </Badge>
                    )}
                    {record.grammarIssues?.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {record.grammarIssues.length} 语法
                      </Badge>
                    )}
                    {record.vocabSuggestions?.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <BookOpen className="h-3 w-3" />
                        {record.vocabSuggestions.length} 词汇
                      </Badge>
                    )}
                    {record.improvementSuggestions?.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Sparkles className="h-3 w-3" />
                        {record.improvementSuggestions.length} 优化
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <Tabs defaultValue="overall">
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="overall" className="text-xs gap-1">
                            <MessageSquareText className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">总评</span>
                          </TabsTrigger>
                          <TabsTrigger value="sentences" className="text-xs gap-1">
                            <FileCheck className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">逐句</span>
                            ({record.sentenceCorrections?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="grammar" className="text-xs gap-1">
                            <Lightbulb className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">语法</span>
                            ({record.grammarIssues?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="vocab" className="text-xs gap-1">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">词汇</span>
                            ({record.vocabSuggestions?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="improvement" className="text-xs gap-1">
                            <Sparkles className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">优化</span>
                            ({record.improvementSuggestions?.length || 0})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overall" className="mt-3">
                          <div className="flex gap-2">
                            <MessageSquareText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{record.overallComment || "暂无总评"}</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="sentences" className="mt-3 space-y-2">
                          {!record.sentenceCorrections?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">暂无逐句批注</p>
                          ) : (
                            record.sentenceCorrections.map((sc: { original: string; revised: string; comment: string }, i: number) => (
                              <CollapsibleSection
                                key={i}
                                summary={
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground shrink-0">#{i + 1}</span>
                                    <span className="text-sm line-clamp-1">{sc.original}</span>
                                    {sc.revised !== sc.original && (
                                      <Badge variant="outline" className="text-xs text-green-600 shrink-0">有修改</Badge>
                                    )}
                                  </div>
                                }
                              >
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">原句</span>
                                    <p className="text-sm mt-0.5">{sc.original}</p>
                                  </div>
                                  {sc.revised !== sc.original && (
                                    <div>
                                      <span className="text-xs font-medium text-muted-foreground">修改建议</span>
                                      <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">{sc.revised}</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">点评</span>
                                    <p className="text-xs text-muted-foreground mt-0.5">{sc.comment}</p>
                                  </div>
                                </div>
                              </CollapsibleSection>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="grammar" className="mt-3 space-y-2">
                          {!record.grammarIssues?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">无语法问题</p>
                          ) : (
                            record.grammarIssues.map((note: any, i: number) => (
                              <CollapsibleSection
                                key={i}
                                summary={
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm">{note.point}</span>
                                    <Badge variant="outline" className="text-xs">{note.level}</Badge>
                                    <span className="text-xs text-muted-foreground line-clamp-1">{note.function}</span>
                                  </div>
                                }
                                action={
                                  <SaveButton type="grammar" data={{
                                    point: note.point, level: note.level, function: note.function,
                                    structure: note.structure, explanation: note.explanation,
                                    examples: note.examples, commonMistakes: note.commonMistakes,
                                    examTip: note.examTip || "",
                                  }} source="history" />
                                }
                              >
                                <div className="space-y-2 text-sm">
                                  {note.structure && (
                                    <div className="flex gap-1.5">
                                      <Link2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                      <p className="text-xs font-mono bg-muted/50 rounded px-2 py-0.5">{note.structure}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground">{note.explanation}</p>
                                  {note.examples?.length > 0 && (
                                    <div className="flex gap-1.5">
                                      <ListChecks className="h-3.5 w-3.5 text-[#5C5956] dark:text-[#C8E5DC] shrink-0 mt-0.5" />
                                      <div className="space-y-0.5">
                                        {note.examples.map((ex: string, j: number) => (
                                          <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">{ex}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {note.commonMistakes?.length > 0 && typeof note.commonMistakes[0] === "object" && (
                                    <div className="flex gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                                      <div className="space-y-1 flex-1">
                                        {note.commonMistakes.map((m: any, j: number) => (
                                          <div key={j} className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                                            <p className="text-xs text-red-600">❌ {m.error}</p>
                                            <p className="text-xs text-green-600">✅ {m.correction}</p>
                                            <p className="text-xs text-muted-foreground">💡 {m.explanation}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {note.examTip && (
                                    <div className="flex gap-1.5">
                                      <Target className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                      <p className="text-xs text-muted-foreground">{note.examTip}</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleSection>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="vocab" className="mt-3 space-y-2">
                          {!record.vocabSuggestions?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">无词汇建议</p>
                          ) : (
                            record.vocabSuggestions.map((note: any, i: number) => (
                              <CollapsibleSection
                                key={i}
                                summary={
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-primary">{note.word}</span>
                                    <Badge variant="outline" className="text-xs">{note.chinese}</Badge>
                                    <Badge variant="outline" className="text-xs">{note.level}</Badge>
                                  </div>
                                }
                                action={
                                  <SaveButton type="word" data={{
                                    word: note.word, chinese: note.chinese,
                                    collocations: note.collocations || [], synonyms: note.synonyms || [],
                                    level: note.level, usage: note.usage,
                                    examples: note.examples || [], commonErrors: note.commonErrors || [],
                                    examFocus: note.examFocus || "",
                                  }} source="history" />
                                }
                              >
                                <div className="space-y-2 text-sm">
                                  {note.collocations?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {note.collocations.map((c: string, j: number) => (
                                        <Badge key={j} variant="secondary" className="text-xs font-mono">{c}</Badge>
                                      ))}
                                    </div>
                                  )}
                                  {note.synonyms?.length > 0 && (
                                    <div className="flex gap-1.5">
                                      <ArrowLeftRight className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                      <p className="text-xs text-muted-foreground">{note.synonyms.join(" · ")}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground">{note.usage}</p>
                                  {note.examples?.length > 0 && note.examples.map((ex: string, j: number) => (
                                    <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">{ex}</p>
                                  ))}
                                  {note.examFocus && (
                                    <div className="flex gap-1.5">
                                      <Target className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                      <p className="text-xs text-muted-foreground">{note.examFocus}</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleSection>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="improvement" className="mt-3 space-y-2">
                          {!record.improvementSuggestions?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">暂无优化建议</p>
                          ) : (
                            record.improvementSuggestions.map((item: { suggestion: string; reason: string }, i: number) => (
                              <div key={i} className="border rounded-lg p-3 bg-muted/10 space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <div className="space-y-1.5 flex-1">
                                    <p className="text-sm font-medium">{item.suggestion}</p>
                                    <div className="flex gap-1.5">
                                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            )})}
          </div>

          {page < totalPages && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                加载更多 ({page}/{totalPages})
              </Button>
            </div>
          )}
        </>
      )}

      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => { if (!open) setShareTarget(null); }}
        contentType={shareTarget?.type ?? "correction"}
        contentId={shareTarget?.id ?? ""}
      />
    </div>
  );
}
