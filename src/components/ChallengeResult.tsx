"use client";

/**
 * ChallengeResult — 周末挑战结果展示。
 *
 * 复用 CorrectionResult 的 UI 模式，顶部加挑战信息栏。
 * 支持从 API 获取完整 feedback。
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SaveButton } from "@/components/SaveButton";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/ShareDialog";
import {
  Trophy,
  Clock,
  FileText,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Target,
  ListChecks,
  Link2,
  ArrowLeftRight,
  Sparkles,
  MessageSquareText,
  FileCheck,
  Share2,
  Loader2,
} from "lucide-react";
import type {
  CorrectionResult as CorrectionResultType,
  GrammarNote,
  VocabNote,
  SentenceCorrection,
  ImprovementSuggestion,
  ScoreBreakdown,
  ShareContentType,
} from "@/types";

// ── 难度配置 ──

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "#ABD1C6" },
  hard: { label: "困难", color: "#E07B7B" },
};

// ── ScoreBar ──

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

// ── Props ──

interface Props {
  result: CorrectionResultType & {
    id?: string;
    wordCount?: number;
    timeSpent?: number;
    remaining?: number;
  };
  difficulty: string;
  date: string;
  topic: string;
  submissionId: string;
}

export function ChallengeResult({ result, difficulty, date, topic, submissionId }: Props) {
  const [fullResult, setFullResult] = useState(result);
  const [loadingFull, setLoadingFull] = useState(!result.overallComment);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    type: ShareContentType;
  } | null>(null);

  // 如果初始 result 不完整（从列表 API 来的），加载完整数据
  useEffect(() => {
    if (result.overallComment && result.sentenceCorrections?.length > 0) {
      setLoadingFull(false);
      return;
    }

    fetch(`/api/challenges/submissions/${submissionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.feedback) {
          setFullResult({
            totalScore: d.feedback.totalScore || d.score,
            maxScore: d.feedback.maxScore || d.maxScore,
            scores: d.feedback.scores || d.scores,
            scoringRationale: d.feedback.scoringRationale,
            sentenceCorrections: d.feedback.sentenceCorrections || [],
            grammarIssues: d.feedback.grammarIssues || [],
            vocabSuggestions: d.feedback.vocabSuggestions || [],
            improvementSuggestions: d.feedback.improvementSuggestions || [],
            overallComment: d.feedback.overallComment || "",
            wordCount: d.wordCount,
            timeSpent: d.timeSpent,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFull(false));
  }, [submissionId, result]);

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const r = fullResult;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-6">
        {/* 挑战信息栏 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: config.color }} />
            <span className="font-semibold">周末挑战</span>
            <Badge style={{ backgroundColor: config.color, color: "#312F2C" }}>
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{date}</span>
            <span>话题：{topic}</span>
            {r.wordCount && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {r.wordCount}词
              </span>
            )}
            {r.timeSpent && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(r.timeSpent)}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {loadingFull ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 分数总览 */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">批改结果</h3>
              <div className="flex items-center gap-2">
                {r.remaining !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    今日剩余 {r.remaining} 次
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShareTarget({ id: submissionId, type: "correction" })}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-6">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-primary">
                  {r.totalScore}
                  <span className="text-lg text-muted-foreground font-normal">
                    /{r.maxScore}
                  </span>
                </p>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <ScoreBar label="内容" score={r.scores.content} max={getDims(r.maxScore).maxes[0]} />
                <ScoreBar label="结构" score={r.scores.structure} max={getDims(r.maxScore).maxes[1]} />
                <ScoreBar label="语法" score={r.scores.grammar} max={getDims(r.maxScore).maxes[2]} />
                <ScoreBar label="词汇" score={r.scores.vocabulary} max={getDims(r.maxScore).maxes[3]} />
              </div>
            </div>

            {/* 总评 */}
            {r.overallComment && (
              <div className="flex gap-2">
                <MessageSquareText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium">总评</span>
                  <p className="text-sm text-muted-foreground mt-1">{r.overallComment}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* 详细分析 Tabs */}
            <Tabs defaultValue="sentences">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="sentences" className="gap-1 text-xs">
                  <FileCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">逐句批注</span>
                  ({r.sentenceCorrections?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="grammar" className="gap-1 text-xs">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">语法问题</span>
                  ({r.grammarIssues?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="vocab" className="gap-1 text-xs">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">词汇建议</span>
                  ({r.vocabSuggestions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="improvement" className="gap-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">优化建议</span>
                  ({r.improvementSuggestions?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sentences" className="mt-4 space-y-2">
                {renderSentences(r.sentenceCorrections)}
              </TabsContent>
              <TabsContent value="grammar" className="mt-4 space-y-3">
                {renderGrammar(r.grammarIssues)}
              </TabsContent>
              <TabsContent value="vocab" className="mt-4 space-y-3">
                {renderVocab(r.vocabSuggestions)}
              </TabsContent>
              <TabsContent value="improvement" className="mt-4 space-y-3">
                {renderImprovement(r.improvementSuggestions)}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>

      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        contentType={shareTarget?.type ?? "correction"}
        contentId={shareTarget?.id ?? ""}
      />
    </Card>
  );
}

// ── 维度最大值 ──

function getDims(maxScore: number) {
  if (maxScore <= 9) return { labels: ["内容", "结构", "语法", "词汇"], maxes: [2.5, 2.5, 2, 2] };
  if (maxScore <= 15) return { labels: ["内容", "结构", "语法", "词汇"], maxes: [4, 4, 4, 3] };
  if (maxScore <= 25) return { labels: ["内容", "结构", "语法", "词汇"], maxes: [7, 6, 6, 6] };
  return { labels: ["内容", "结构", "语法", "词汇"], maxes: [30, 25, 25, 20] };
}

// ── 各 Tab 内容渲染 ──

function renderSentences(items: SentenceCorrection[]) {
  if (!items?.length)
    return <p className="text-sm text-muted-foreground text-center py-4">暂无逐句批注</p>;
  return items.map((sc, i) => (
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
      <div className="space-y-2">
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
  ));
}

function renderGrammar(items: GrammarNote[]) {
  if (!items?.length)
    return <p className="text-sm text-muted-foreground text-center py-4">无语法问题</p>;
  return items.map((note, i) => (
    <CollapsibleSection
      key={i}
      summary={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{note.point}</span>
          <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">
            {note.level}
          </Badge>
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
          source="correct"
        />
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
                <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">
                  {ex}
                </p>
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
  ));
}

function renderVocab(items: VocabNote[]) {
  if (!items?.length)
    return <p className="text-sm text-muted-foreground text-center py-4">无词汇建议</p>;
  return items.map((note, i) => (
    <CollapsibleSection
      key={i}
      summary={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-primary">{note.word}</span>
          <Badge variant="outline" className="text-xs">{note.chinese}</Badge>
          <Badge variant={levelVariant[note.level] || "secondary"} className="text-xs">
            {note.level}
          </Badge>
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
          source="correct"
        />
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
        {note.examples?.length > 0 &&
          note.examples.map((ex, j) => (
            <p key={j} className="text-xs italic border-l-2 border-primary/20 pl-2 text-muted-foreground">
              {ex}
            </p>
          ))}
        {note.commonErrors &&
          note.commonErrors.length > 0 &&
          typeof note.commonErrors[0] === "object" && (
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
  ));
}

function renderImprovement(items: ImprovementSuggestion[]) {
  if (!items?.length)
    return <p className="text-sm text-muted-foreground text-center py-4">暂无优化建议</p>;
  return items.map((item, i) => (
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
  ));
}
