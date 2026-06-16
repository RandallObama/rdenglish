"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SaveButton } from "@/components/SaveButton";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  Copy,
  Check,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Target,
  ListChecks,
  Link2,
  ArrowLeftRight,
  Sparkles,
  XCircle,
  Share2,
  ArrowRight,
  ArrowUpDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import type { GrammarNote, VocabNote, ImprovementItem, TransitionAnalysis } from "@/types";

interface OptimizeResultProps {
  resultId?: string;
  optimizedText: string;
  improvements: ImprovementItem[];
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
  highlights: string;
  transitionAnalysis?: TransitionAnalysis;
  remaining: number;
  onTextReplace?: (newText: string) => void;
}

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

const categoryConfig: Record<ImprovementItem["category"], { label: string; color: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  grammar: { label: "语法", color: "text-blue-600 dark:text-blue-400", variant: "default" },
  vocabulary: { label: "词汇", color: "text-green-600 dark:text-green-400", variant: "secondary" },
  logic: { label: "逻辑", color: "text-orange-600 dark:text-orange-400", variant: "outline" },
  structure: { label: "结构", color: "text-purple-600 dark:text-purple-400", variant: "default" },
  content: { label: "内容", color: "text-red-600 dark:text-red-400", variant: "destructive" },
};

export function OptimizeResult({
  resultId,
  optimizedText,
  improvements,
  grammarNotes,
  vocabNotes,
  highlights,
  transitionAnalysis,
  remaining,
  onTextReplace,
}: OptimizeResultProps) {
  const [copied, setCopied] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: "writing" } | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimizedText);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">优化结果</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              今日剩余 {remaining} 次
            </Badge>
            {resultId && (
              <Button variant="ghost" size="sm" onClick={() => setShareTarget({ id: resultId, type: "writing" })}>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 优化后文本 */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {optimizedText}
          </p>
        </div>

        {/* 亮点总结 */}
        {highlights && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{highlights}</p>
          </div>
        )}

        {/* 片段衔接分析 */}
        {transitionAnalysis && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">片段衔接分析</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground">与上文衔接</span>
                <p className="text-sm text-muted-foreground mt-0.5">{transitionAnalysis.beforeCoherence}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">与下文衔接</span>
                <p className="text-sm text-muted-foreground mt-0.5">{transitionAnalysis.afterCoherence}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs: 改进对照 | 语法笔记 | 词汇笔记 */}
        <Tabs defaultValue="improvements">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="improvements" className="gap-1 text-xs">
              <ArrowRight className="h-3.5 w-3.5" />
              改进对照 ({improvements.length})
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-1 text-xs">
              <Lightbulb className="h-3.5 w-3.5" />
              语法笔记 ({grammarNotes.length})
            </TabsTrigger>
            <TabsTrigger value="vocab" className="gap-1 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              词汇笔记 ({vocabNotes.length})
            </TabsTrigger>
          </TabsList>

          {/* ========= 改进对照 Tab ========= */}
          <TabsContent value="improvements" className="mt-4 space-y-3">
            {improvements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                无具体改动记录
              </p>
            ) : (
              improvements.map((item, i) => {
                const cfg = categoryConfig[item.category];
                return (
                  <div
                    key={i}
                    className="border rounded-lg p-4 space-y-2 bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.variant} className="text-[10px]">
                        {cfg.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        #{i + 1}
                      </span>
                    </div>

                    {/* 原文（删改线效果）*/}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-red-500 uppercase">Before</span>
                      <p className="text-sm line-through text-red-600/60 dark:text-red-400/60 bg-red-50 dark:bg-red-950/20 rounded px-3 py-2">
                        {item.original}
                      </p>
                    </div>

                    {/* 优化后 */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-green-500 uppercase">After</span>
                      <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded px-3 py-2">
                        {item.optimized}
                      </p>
                    </div>

                    {/* 理由 */}
                    <div className="flex items-start gap-1.5 pt-1 border-t">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ========= 语法笔记 Tab ========= */}
          <TabsContent value="grammar" className="mt-4 space-y-3">
            {grammarNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无语法要点
              </p>
            ) : (
              grammarNotes.map((note, i) => (
                <CollapsibleSection
                  key={i}
                  summary={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{note.point}</span>
                      <Badge
                        variant={levelVariant[note.level] || "secondary"}
                        className="text-xs"
                      >
                        {note.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {note.function}
                      </span>
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
                      source="optimize"
                    />
                  }
                >
                  <div className="space-y-4">
                    {/* 结构公式 */}
                    <div className="flex gap-2">
                      <Link2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          结构公式
                        </span>
                        <p className="text-sm font-mono bg-muted/50 rounded px-2 py-1 mt-0.5">
                          {note.structure}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* 详细讲解 */}
                    <div className="flex gap-2">
                      <BookOpen className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          详细讲解
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {note.explanation}
                        </p>
                      </div>
                    </div>

                    {/* 例句 */}
                    {note.examples && note.examples.length > 0 && (
                      <div className="flex gap-2">
                        <ListChecks className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            例句
                          </span>
                          <ul className="mt-1 space-y-1">
                            {note.examples.map((ex, j) => (
                              <li
                                key={j}
                                className="text-sm italic border-l-2 border-primary/20 pl-3 text-muted-foreground"
                              >
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* 常见错误 */}
                    {note.commonMistakes &&
                      Array.isArray(note.commonMistakes) &&
                      note.commonMistakes.length > 0 && (
                        <div className="flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              常见错误
                            </span>
                            {note.commonMistakes.map((mistake, j) => (
                              <div
                                key={j}
                                className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 space-y-1.5"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    ❌ 错误：{mistake.error}
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    ✅ 正确：{mistake.correction}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground border-t border-orange-200 dark:border-orange-800 pt-1.5">
                                  💡 {mistake.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* 考试提示 */}
                    {note.examTip && (
                      <div className="flex gap-2">
                        <Target className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            考试提示
                          </span>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {note.examTip}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))
            )}
          </TabsContent>

          {/* ========= 词汇笔记 Tab ========= */}
          <TabsContent value="vocab" className="mt-4 space-y-3">
            {vocabNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无词汇笔记
              </p>
            ) : (
              vocabNotes.map((note, i) => (
                <CollapsibleSection
                  key={i}
                  summary={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-primary">
                        {note.word}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {note.chinese}
                      </Badge>
                      <Badge
                        variant={levelVariant[note.level] || "secondary"}
                        className="text-xs"
                      >
                        {note.level}
                      </Badge>
                      {note.usage && (
                        <span className="text-sm text-muted-foreground line-clamp-1 hidden sm:inline">
                          {note.usage.length > 40
                            ? note.usage.slice(0, 40) + "…"
                            : note.usage}
                        </span>
                      )}
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
                      source="optimize"
                    />
                  }
                >
                  <div className="space-y-4">
                    {note.collocations && note.collocations.length > 0 && (
                      <div className="flex gap-2">
                        <Link2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            常用搭配
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {note.collocations.map((col, j) => (
                              <Badge
                                key={j}
                                variant="secondary"
                                className="text-xs font-mono"
                              >
                                {col}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {note.synonyms && note.synonyms.length > 0 && (
                      <div className="flex gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            近义词辨析
                          </span>
                          <ul className="mt-1 space-y-0.5">
                            {note.synonyms.map((syn, j) => (
                              <li
                                key={j}
                                className="text-sm text-muted-foreground"
                              >
                                • {syn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex gap-2">
                      <BookOpen className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          用法说明
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {note.usage}
                        </p>
                      </div>
                    </div>

                    {note.examples && note.examples.length > 0 && (
                      <div className="flex gap-2">
                        <ListChecks className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            例句
                          </span>
                          <ul className="mt-1 space-y-1">
                            {note.examples.map((ex, j) => (
                              <li
                                key={j}
                                className="text-sm italic border-l-2 border-primary/20 pl-3 text-muted-foreground"
                              >
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {note.commonErrors &&
                      Array.isArray(note.commonErrors) &&
                      note.commonErrors.length > 0 && (
                        <div className="flex gap-2">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              常见误用
                            </span>
                            {note.commonErrors.map((err, j) => (
                              <div
                                key={j}
                                className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 space-y-1.5"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    ❌ 误用：{err.error}
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    ✅ 正确：{err.correction}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground border-t border-red-200 dark:border-red-800 pt-1.5">
                                  💡 {err.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {note.examFocus && (
                      <div className="flex gap-2">
                        <Target className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            考试关注
                          </span>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {note.examFocus}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => { if (!open) setShareTarget(null); }}
        contentType={shareTarget?.type ?? "writing"}
        contentId={shareTarget?.id ?? ""}
      />
    </Card>
  );
}
