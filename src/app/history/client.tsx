"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, BookOpen, Lightbulb, Clock, ChevronDown, ChevronRight, ChevronUp, Share2, Sparkles, FileCheck } from "lucide-react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { SaveButton } from "@/components/SaveButton";
import { ShareDialog } from "@/components/ShareDialog";
import type { GrammarNote, VocabNote, ShareContentType } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { getBtnStyle } from "@/lib/button-colors";
import type { WritingRecord } from "@/types";

const styleLabels: Record<string, string> = {
  daily: "日常",
  academic: "学术",
  business: "商务",
};

const PAGE_SIZE = 15;

export default function HistoryClient() {
  const [records, setRecords] = useState<WritingRecord[]>([]);
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
      const res = await fetch(`/api/history?page=${pageNum}&pageSize=${PAGE_SIZE}`);
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
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
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
          <h1 className="text-xl sm:text-2xl font-bold">翻译记录</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查看你之前的翻译记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/history/corrections" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <FileCheck className="h-4 w-4 mr-1" />
            批改记录
          </Link>
          <Link href="/history/optimizations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Sparkles className="h-4 w-4 mr-1" />
            优化记录
          </Link>
          <Link href="/write" className={buttonVariants({ size: "sm" })} style={getBtnStyle("history:new-write")}>
            新建翻译
          </Link>
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无记录</h3>
            <p className="text-muted-foreground text-sm mb-4">
              开始你的第一次翻译吧
            </p>
            <Link href="/write" className={buttonVariants()} style={getBtnStyle("history:start-write")}>
              开始写作
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
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {record.sourceText}
                      </p>
                      <p className={`text-base whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-3"}`}>
                        {record.resultText}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareTarget({ id: record.id, type: "writing" });
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
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">翻译结果</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{record.resultText}</p>
                      </div>

                      {record.grammarNotes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            语法要点 ({record.grammarNotes.length})
                          </p>
                          <div className="space-y-2">
                            {record.grammarNotes.map((note: GrammarNote, i: number) => (
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
                                  <SaveButton
                                    type="grammar"
                                    data={{
                                      point: note.point,
                                      level: note.level,
                                      function: note.function,
                                      structure: note.structure,
                                      explanation: note.explanation,
                                      examples: note.examples,
                                      commonMistakes: note.commonMistakes,
                                      examTip: note.examTip || "",
                                    }}
                                    source="history"
                                  />
                                }
                              >
                                <div className="space-y-2 text-sm">
                                  {note.structure && (
                                    <div>
                                      <span className="text-xs text-muted-foreground">结构公式</span>
                                      <p className="font-mono bg-muted/50 rounded px-2 py-0.5 mt-0.5 text-xs">{note.structure}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground">{note.explanation}</p>
                                  {note.examples?.length > 0 && (
                                    <div>
                                      <span className="text-xs text-muted-foreground">例句</span>
                                      {note.examples.map((ex: string, j: number) => (
                                        <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 mt-0.5 text-muted-foreground">{ex}</p>
                                      ))}
                                    </div>
                                  )}
                                  {note.examTip && (
                                    <p className="text-xs text-muted-foreground">🎯 {note.examTip}</p>
                                  )}
                                </div>
                              </CollapsibleSection>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.vocabNotes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            词汇笔记 ({record.vocabNotes.length})
                          </p>
                          <div className="space-y-2">
                            {record.vocabNotes.map((note: VocabNote, i: number) => (
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
                                  <SaveButton
                                    type="word"
                                    data={{
                                      word: note.word,
                                      chinese: note.chinese,
                                      collocations: note.collocations || [],
                                      synonyms: note.synonyms || [],
                                      level: note.level,
                                      usage: note.usage,
                                      examples: note.examples || [],
                                      commonErrors: note.commonErrors || [],
                                      examFocus: note.examFocus || "",
                                    }}
                                    source="history"
                                  />
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
                                  <p className="text-xs text-muted-foreground">{note.usage}</p>
                                  {note.examples?.length > 0 && note.examples.map((ex: string, j: number) => (
                                    <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">{ex}</p>
                                  ))}
                                  {note.examFocus && (
                                    <p className="text-xs text-muted-foreground">🎯 {note.examFocus}</p>
                                  )}
                                </div>
                              </CollapsibleSection>
                            ))}
                          </div>
                        </div>
                      )}
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
        contentType={shareTarget?.type ?? "writing"}
        contentId={shareTarget?.id ?? ""}
      />
    </div>
  );
}
