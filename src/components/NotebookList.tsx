"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { VocabPrintDialog } from "@/components/VocabPrintDialog";
import {
  Trash2,
  BookOpen,
  Lightbulb,
  Bookmark,
  AlertTriangle,
  Target,
  ListChecks,
  Link2,
  ArrowLeftRight,
  Sparkles,
  XCircle,
  Printer,
  Share2,
  CheckSquare,
  Square,
  ArrowRightToLine,
} from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { getBtnStyle } from "@/lib/button-colors";
import type { SavedWordItem, SavedGrammarItem, ShareContentType } from "@/types";

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

export interface TransferWord {
  word: string;
  chinese: string;
  level?: string;
  usage?: string;
}

interface NotebookListProps {
  words: SavedWordItem[];
  grammars: SavedGrammarItem[];
  onDeleteWord: (id: string) => void;
  onDeleteGrammar: (id: string) => void;
  onTransferWords?: (words: TransferWord[]) => void;
}

export function NotebookList({
  words,
  grammars,
  onDeleteWord,
  onDeleteGrammar,
  onTransferWords,
}: NotebookListProps) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: ShareContentType } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (words.length === 0 && grammars.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">笔记本是空的</h3>
          <p className="text-muted-foreground text-sm">
            在翻译或批改结果中点击收藏按钮，将生词和语法知识保存到这里
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue="words">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="words" className="gap-1" style={getBtnStyle("notebook:tab-words")}>
            <BookOpen className="h-4 w-4" />
            生词 ({words.length})
          </TabsTrigger>
          <TabsTrigger value="grammars" className="gap-1" style={getBtnStyle("notebook:tab-grammar")}>
            <Lightbulb className="h-4 w-4" />
            语法 ({grammars.length})
          </TabsTrigger>
        </TabsList>

        {/* 生词列表 */}
        <TabsContent value="words" className="space-y-3">
          {words.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                共 {words.length} 个生词
                {selectMode && selectedIds.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    已选 {selectedIds.size} 个
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {selectMode ? (
                  <>
                    {onTransferWords && selectedIds.size > 0 && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const selected = words
                            .filter((w) => selectedIds.has(w.id))
                            .map((w) => ({
                              word: w.word,
                              chinese: w.chinese,
                              level: w.level,
                              usage: w.usage,
                            }));
                          onTransferWords(selected);
                          setSelectMode(false);
                          setSelectedIds(new Set());
                        }}
                        style={getBtnStyle("notebook:batch-transfer")}
                      >
                        <ArrowRightToLine className="mr-1.5 h-4 w-4" />
                        转移到单词本 ({selectedIds.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectMode(false);
                        setSelectedIds(new Set());
                      }}
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    {onTransferWords && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectMode(true)}
                        style={getBtnStyle("notebook:batch-select")}
                      >
                        <CheckSquare className="mr-1.5 h-4 w-4" />
                        批量选择
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrintDialogOpen(true)}
                      style={getBtnStyle("notebook:print")}
                    >
                      <Printer className="mr-1.5 h-4 w-4" />
                      打印词汇
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          {words.map((w) => (
            <CollapsibleSection
              key={w.id}
              summary={
                <div className="flex items-center gap-2 flex-wrap">
                  {selectMode && (
                    <button
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(w.id)) next.delete(w.id);
                          else next.add(w.id);
                          return next;
                        });
                      }}
                    >
                      {selectedIds.has(w.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <span className="font-bold text-lg text-primary">{w.word}</span>
                  <Badge variant="outline">{w.chinese}</Badge>
                  <Badge variant={levelVariant[w.level] || "secondary"} className="text-xs">
                    {w.level}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {w.source === "correct" ? "来自批改" : "来自翻译"}
                  </Badge>
                </div>
              }
              action={
                <div className="flex items-center gap-1">
                  {onTransferWords && !selectMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="转移到单词本"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransferWords([
                          {
                            word: w.word,
                            chinese: w.chinese,
                            level: w.level,
                            usage: w.usage,
                          },
                        ]);
                      }}
                    >
                      <ArrowRightToLine className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareTarget({ id: w.id, type: "savedWord" });
                    }}
                  >
                    <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWord(w.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {w.collocations && w.collocations.length > 0 && (
                  <div className="flex gap-2">
                    <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {w.collocations.map((c, j) => (
                        <Badge key={j} variant="secondary" className="text-xs font-mono">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {w.synonyms && w.synonyms.length > 0 && (
                  <div className="flex gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {w.synonyms.join(" · ")}
                    </p>
                  </div>
                )}

                {w.usage && (
                  <div className="flex gap-2">
                    <BookOpen className="h-4 w-4 text-[#5C5956] dark:text-[#C8E5DC] shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{w.usage}</p>
                  </div>
                )}

                {w.examples && w.examples.length > 0 && (
                  <div className="flex gap-2">
                    <ListChecks className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      {w.examples.map((ex, j) => (
                        <p key={j} className="text-sm italic text-muted-foreground">• {ex}</p>
                      ))}
                    </div>
                  </div>
                )}

                {w.commonErrors && w.commonErrors.length > 0 && (
                  <div className="flex gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {w.commonErrors.map((e, j) => (
                        <div key={j} className="bg-red-50 dark:bg-red-950/30 rounded p-2">
                          <p className="text-xs text-red-600">❌ {e.error}</p>
                          <p className="text-xs text-green-600">✅ {e.correction}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">💡 {e.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {w.examFocus && (
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{w.examFocus}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          ))}
        </TabsContent>

        {/* 语法列表 */}
        <TabsContent value="grammars" className="space-y-3">
          {grammars.map((g) => (
            <CollapsibleSection
              key={g.id}
              summary={
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base">{g.point}</span>
                  <Badge variant={levelVariant[g.level] || "secondary"} className="text-xs">
                    {g.level}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {g.source === "correct" ? "来自批改" : "来自翻译"}
                  </Badge>
                </div>
              }
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareTarget({ id: g.id, type: "savedGrammar" });
                    }}
                  >
                    <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGrammar(g.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {g.function && (
                  <div className="flex gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">{g.function}</p>
                  </div>
                )}

                {g.structure && (
                  <div className="flex gap-2">
                    <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm font-mono bg-muted/50 rounded px-2 py-1">{g.structure}</p>
                  </div>
                )}

                <Separator />

                {g.explanation && (
                  <p className="text-sm text-muted-foreground">{g.explanation}</p>
                )}

                {g.examples && g.examples.length > 0 && (
                  <div>
                    {g.examples.map((ex, j) => (
                      <p key={j} className="text-sm italic border-l-2 border-primary/20 pl-3 text-muted-foreground">
                        {ex}
                      </p>
                    ))}
                  </div>
                )}

                {g.commonMistakes && g.commonMistakes.length > 0 && (
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {g.commonMistakes.map((m, j) => (
                        <div key={j} className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                          <p className="text-xs text-red-600">❌ {m.error}</p>
                          <p className="text-xs text-green-600">✅ {m.correction}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">💡 {m.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {g.examTip && (
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{g.examTip}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          ))}
        </TabsContent>
      </Tabs>

      <VocabPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        words={words.map((w) => ({
          word: w.word,
          chinese: w.chinese,
          level: w.level || "基础",
        }))}
      />

      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => { if (!open) setShareTarget(null); }}
        contentType={shareTarget?.type ?? "savedWord"}
        contentId={shareTarget?.id ?? ""}
      />
    </>
  );
}
