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
  FileCheck,
  XCircle,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import type { GrammarNote, SentenceTranslationReview, VocabNote, ShareContentType } from "@/types";
import { deduplicateGrammarNotes } from "@/lib/grammar-dedup";

interface ResultCardProps {
  resultId?: string;
  english: string;
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
  remaining: number;
  sentenceReviews?: SentenceTranslationReview[];
}

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

export function ResultCard({
  resultId,
  english,
  grammarNotes,
  vocabNotes,
  remaining,
  sentenceReviews,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: ShareContentType } | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(english);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">翻译结果</h3>
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

        {/* 翻译文本 */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {english}
          </p>
        </div>

        {/* 语法 & 词汇 */}
        <Tabs defaultValue="sentences">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sentences" className="gap-1 text-xs">
              <FileCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">逐句点评</span>
              <span className="sm:hidden">逐句</span>
              ({sentenceReviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-1">
              <Lightbulb className="h-4 w-4" />
              语法要点 ({deduplicateGrammarNotes(grammarNotes).length})
            </TabsTrigger>
            <TabsTrigger value="vocab" className="gap-1">
              <BookOpen className="h-4 w-4" />
              词汇笔记 ({vocabNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sentences" className="mt-4 space-y-3">
            {!sentenceReviews?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无逐句点评</p>
            ) : (
              sentenceReviews.map((sr, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">原文</span>
                  </div>
                  <p className="text-sm pl-7">{sr.sourceSentence}</p>
                  <div className="pl-7">
                    <span className="text-xs font-medium text-muted-foreground">译文</span>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">{sr.translatedSentence}</p>
                  </div>
                  <div className="pl-7">
                    <span className="text-xs font-medium text-muted-foreground">点评</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{sr.quality}</p>
                  </div>
                  {sr.suggestions && (
                    <div className="pl-7">
                      <span className="text-xs font-medium text-muted-foreground">建议</span>
                      <p className="text-sm text-muted-foreground mt-0.5">💡 {sr.suggestions}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* ========= 语法标签页 ========= */}
          <TabsContent value="grammar" className="mt-4 space-y-3">
            {grammarNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无语法要点
              </p>
            ) : (
              deduplicateGrammarNotes(grammarNotes).map((note, i) => (
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
                      source="translate"
                    />
                  }
                >
                  <div className="space-y-4">
                    {/* 结构公式 */}
                    <div className="flex gap-2">
                      <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
                        <ListChecks className="h-4 w-4 text-[#5C5956] dark:text-[#C8E5DC] shrink-0 mt-0.5" />
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
                            {note.commonMistakes.map((mistake, j) => {
                              const isObject = typeof mistake === "object" && mistake !== null;
                              return (
                                <div
                                  key={j}
                                  className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 space-y-1.5"
                                >
                                  {isObject ? (
                                    <>
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
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      ❌ {String(mistake)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
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

          {/* ========= 词汇标签页 ========= */}
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
                      {(note.phoneticUK || note.phoneticUS) && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {note.phoneticUK && `UK /${note.phoneticUK}/`}
                          {note.phoneticUK && note.phoneticUS && note.phoneticUK !== note.phoneticUS && " "}
                          {note.phoneticUS && note.phoneticUS !== note.phoneticUK && `US /${note.phoneticUS}/`}
                        </span>
                      )}
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
                        phoneticUK: note.phoneticUK || "",
                        phoneticUS: note.phoneticUS || "",
                        collocations: note.collocations || [],
                        synonyms: note.synonyms || [],
                        level: note.level,
                        usage: note.usage,
                        examples: note.examples || [],
                        commonErrors: note.commonErrors || [],
                        examFocus: note.examFocus || "",
                      }}
                      source="translate"
                    />
                  }
                >
                  <div className="space-y-4">
                    {/* 搭配 */}
                    {note.collocations && note.collocations.length > 0 && (
                      <div className="flex gap-2">
                        <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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

                    {/* 近义词 */}
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

                    {/* 用法说明 */}
                    <div className="flex gap-2">
                      <BookOpen className="h-4 w-4 text-[#5C5956] dark:text-[#C8E5DC] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          用法说明
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {note.usage}
                        </p>
                      </div>
                    </div>

                    {/* 例句 */}
                    {note.examples && note.examples.length > 0 && (
                      <div className="flex gap-2">
                        <ListChecks className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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

                    {/* 常见误用 */}
                    {note.commonErrors &&
                      Array.isArray(note.commonErrors) &&
                      note.commonErrors.length > 0 && (
                        <div className="flex gap-2">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              常见误用
                            </span>
                            {note.commonErrors.map((err, j) => {
                              const isObject = typeof err === "object" && err !== null;
                              return (
                                <div
                                  key={j}
                                  className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 space-y-1.5"
                                >
                                  {isObject ? (
                                    <>
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
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      ❌ {String(err)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* 考试关注 */}
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
