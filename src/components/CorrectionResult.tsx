"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SaveButton } from "@/components/SaveButton";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Target,
  ListChecks,
  Link2,
  ArrowLeftRight,
  Sparkles,
  XCircle,
  FileCheck,
  MessageSquareText,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ShareDialog } from "@/components/ShareDialog";
import type { CorrectionResult as CorrectionResultType, ExamType, ShareContentType } from "@/types";

interface Props {
  result: CorrectionResultType;
  remaining: number;
  correctionId?: string;
}

function getScoreDimensions(examType?: ExamType, maxScore?: number) {
  if (examType === "literary") {
    return {
      labels: ["情节构建", "语言风格", "人物场景", "主题统一"],
      maxes: [30, 30, 20, 20],
    };
  }
  const m = maxScore || 100;
  return {
    labels: ["内容", "结构", "语法", "词汇"],
    maxes: [
      m > 25 ? 30 : m > 9 ? 7 : 4,
      m > 25 ? 25 : m > 9 ? 6 : 4,
      m > 25 ? 25 : m > 9 ? 6 : 4,
      m > 25 ? 20 : m > 9 ? 6 : 3,
    ],
  };
}

const levelVariant = {
  "基础": "secondary" as const,
  "进阶": "default" as const,
  "高级": "destructive" as const,
} as Record<string, "secondary" | "default" | "destructive">;

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium w-12 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

export function CorrectionResult({ result, remaining, correctionId }: Props) {
  const [shareTarget, setShareTarget] = useState<{ id: string; type: ShareContentType } | null>(null);
  return (
    <Card className="mt-6">
      <CardContent className="p-4 md:p-6 space-y-6">
        {/* 分数总览 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">批改结果</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              今日剩余 {remaining} 次
            </Badge>
            {correctionId && (
              <Button variant="ghost" size="sm" onClick={() => setShareTarget({ id: correctionId, type: "correction" })}>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-6">
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-primary">
              {result.totalScore}
              <span className="text-lg text-muted-foreground font-normal">
                /{result.maxScore}
              </span>
            </p>
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            {(() => {
              const dims = getScoreDimensions(result.examType, result.maxScore);
              return (
                <>
                  <ScoreBar label={dims.labels[0]} score={result.scores.content} max={dims.maxes[0]} />
                  <ScoreBar label={dims.labels[1]} score={result.scores.structure} max={dims.maxes[1]} />
                  <ScoreBar label={dims.labels[2]} score={result.scores.grammar} max={dims.maxes[2]} />
                  <ScoreBar label={dims.labels[3]} score={result.scores.vocabulary} max={dims.maxes[3]} />
                </>
              );
            })()}
          </div>
        </div>

        {/* 总评 */}
        <div className="flex gap-2">
          <MessageSquareText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-sm font-medium">总评</span>
            <p className="text-sm text-muted-foreground mt-1">{result.overallComment}</p>
          </div>
        </div>

        <Separator />

        {/* 详细分析 */}
        <Tabs defaultValue="sentences">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="sentences" className="gap-1 text-xs">
              <FileCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">逐句</span>
              <span className="hidden sm:inline">逐句批注</span>
              ({result.sentenceCorrections?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-1 text-xs">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">语法</span>
              <span className="hidden sm:inline">语法问题</span>
              ({result.grammarIssues?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="vocab" className="gap-1 text-xs">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">词汇</span>
              <span className="hidden sm:inline">词汇建议</span>
              ({result.vocabSuggestions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="improvement" className="gap-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">优化</span>
              <span className="hidden sm:inline">优化建议</span>
              ({result.improvementSuggestions?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 逐句批注 */}
          <TabsContent value="sentences" className="mt-4 space-y-2">
            {!result.sentenceCorrections?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无逐句批注</p>
            ) : (
              result.sentenceCorrections.map((sc, i) => (
                <CollapsibleSection
                  key={i}
                  summary={
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-sm line-clamp-1">
                        {sc.original}
                      </span>
                      {sc.revised !== sc.original && (
                        <Badge variant="outline" className="text-xs text-green-600 shrink-0">
                          有修改
                        </Badge>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">原句</span>
                      <p className="text-sm mt-0.5">{sc.original}</p>
                    </div>
                    {sc.revised !== sc.original && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">修改建议</span>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                          {sc.revised}
                        </p>
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

          {/* 语法问题 */}
          <TabsContent value="grammar" className="mt-4 space-y-3">
            {!result.grammarIssues?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">无语法问题</p>
            ) : (
              result.grammarIssues.map((note, i) => (
                <CollapsibleSection
                  key={i}
                  summary={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{note.point}</span>
                      <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">
                        {note.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {note.function}
                      </span>
                    </div>
                  }
                  action={
                    <SaveButton type="grammar" data={{
                      point: note.point, level: note.level, function: note.function,
                      structure: note.structure, explanation: note.explanation,
                      examples: note.examples, commonMistakes: note.commonMistakes,
                      examTip: note.examTip || "",
                    }} source="correct" />
                  }
                >
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs font-mono bg-muted/50 rounded px-2 py-0.5">{note.structure}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{note.explanation}</p>
                    {note.examples?.length > 0 && (
                      <div className="flex gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-[#5C5956] dark:text-[#C8E5DC] shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          {note.examples.map((ex, j) => (
                            <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">{ex}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {note.commonMistakes?.length > 0 && typeof note.commonMistakes[0] === "object" && (
                      <div className="flex gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          {note.commonMistakes.map((m, j) => (
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

          {/* 词汇建议 */}
          <TabsContent value="vocab" className="mt-4 space-y-3">
            {!result.vocabSuggestions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">无词汇建议</p>
            ) : (
              result.vocabSuggestions.map((note, i) => (
                <CollapsibleSection
                  key={i}
                  summary={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-primary">{note.word}</span>
                      <Badge variant="outline" className="text-xs">{note.chinese}</Badge>
                      <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">{note.level}</Badge>
                    </div>
                  }
                  action={
                    <SaveButton type="word" data={{
                      word: note.word, chinese: note.chinese,
                      collocations: note.collocations || [], synonyms: note.synonyms || [],
                      level: note.level, usage: note.usage,
                      examples: note.examples || [], commonErrors: note.commonErrors || [],
                      examFocus: note.examFocus || "",
                    }} source="correct" />
                  }
                >
                  <div className="space-y-3">
                    {note.collocations?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.collocations.map((c, j) => (
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
                    {note.examples?.length > 0 && note.examples.map((ex, j) => (
                      <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">{ex}</p>
                    ))}
                    {note.commonErrors && note.commonErrors.length > 0 && typeof note.commonErrors[0] === "object" && (
                      <div className="space-y-1">
                        {note.commonErrors.map((e, j) => (
                          <div key={j} className="bg-red-50 dark:bg-red-950/30 rounded p-2">
                            <p className="text-xs text-red-600">❌ {e.error}</p>
                            <p className="text-xs text-green-600">✅ {e.correction}</p>
                            <p className="text-xs text-muted-foreground">💡 {e.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))
            )}
          </TabsContent>

          {/* 优化建议 — 保持原样简洁列表 */}
          <TabsContent value="improvement" className="mt-4 space-y-3">
            {!result.improvementSuggestions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无优化建议</p>
            ) : (
              result.improvementSuggestions.map((item, i) => (
                <div key={i} className="border rounded-lg p-4 bg-muted/10 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-medium">{item.suggestion}</p>
                      <div className="flex gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => { if (!open) setShareTarget(null); }}
        contentType={shareTarget?.type ?? "correction"}
        contentId={shareTarget?.id ?? ""}
      />
    </Card>
  );
}
