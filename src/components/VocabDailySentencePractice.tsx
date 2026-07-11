"use client";

import { useState, useCallback } from "react";
import { Loader2, Send, Star, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getBtnStyle } from "@/lib/button-colors";
import { readSSE } from "@/lib/stream";
import type { WordItem, SentenceEvaluationResult } from "@/types";

interface Props {
  sessionId: string;
  words: WordItem[];
  currentIndex: number;
  onDone: () => void;
}

export function VocabDailySentencePractice({
  sessionId,
  words,
  currentIndex: initialIndex,
  onDone,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [sentence, setSentence] = useState("");
  const [evaluation, setEvaluation] = useState<SentenceEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const word = words[index];
  if (!word) return null;

  const isLastWord = index >= words.length - 1;
  const completedCount = index + (evaluation ? 1 : 0);

  const handleSubmit = useCallback(async () => {
    if (!sentence.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/vocab/daily/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          wordIndex: index,
          sentence: sentence.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "提交失败" }));
        toast.error(data.error || "提交失败");
        setLoading(false);
        return;
      }

      // 使用 SSE 流式接收 AI 评价
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          // AI 正在输出评价内容
        } else if (event.type === "done") {
          const data = event.result as any;
          const evalResult = {
            score: data.score,
            stars: data.stars,
            semanticCorrect: data.semanticCorrect,
            grammarCorrect: data.grammarCorrect,
            naturalness: data.naturalness,
            comment: data.comment,
            suggestedImprovement: data.suggestedImprovement,
            creativeBonus: data.creativeBonus,
          };
          setEvaluation(evalResult);
          toast.success(evalResult.score >= 4 ? "很不错！" : "已收到评价");
        } else if (event.type === "error") {
          toast.error(event.message);
        }
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [sentence, sessionId, index]);

  const handleNext = useCallback(() => {
    if (isLastWord) {
      onDone();
    } else {
      setIndex((i) => i + 1);
      setSentence("");
      setEvaluation(null);
    }
  }, [isLastWord, onDone]);

  const handleRetry = useCallback(() => {
    setSentence("");
    setEvaluation(null);
  }, []);

  return (
    <div>
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {completedCount} / {words.length}
          </span>
          <span className="text-sm font-medium">
            造一个包含 <strong>{word.word}</strong> 的句子
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${((completedCount) / words.length) * 100}%`,
              backgroundColor: "#ABD1C6",
            }}
          />
        </div>
      </div>

      {/* 当前词汇详情 */}
      <div
        className="border rounded-xl p-6 mb-6"
        style={{ borderColor: "#ABD1C6" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl font-bold">{word.word}</span>
          <span className="text-lg text-muted-foreground">{word.chinese}</span>
          <Badge variant="secondary">{word.partOfSpeech}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{word.definition}</p>
        <div className="text-sm mb-2">
          <span className="font-medium">💡 用法：</span>
          {word.usage}
        </div>
        <div className="text-sm mb-2">
          <span className="font-medium">🔗 搭配：</span>
          {word.collocations.map((c: string, j: number) => (
            <code key={j} className="bg-muted px-1.5 py-0.5 rounded text-xs ml-1">
              {c}
            </code>
          ))}
        </div>
        <div className="text-sm text-muted-foreground italic">
          📖 {word.example}
        </div>
        {word.etymology && (
          <div className="text-sm mt-2 pt-2 border-t border-dashed" style={{ borderColor: "#ABD1C6" }}>
            <span className="font-medium">📚 词源：</span>
            <span className="text-muted-foreground">{word.etymology}</span>
          </div>
        )}
      </div>

      {/* 评价结果 */}
      {evaluation && (
        <div
          className="border rounded-xl p-5 mb-6 transition-all"
          style={{
            borderColor: evaluation.score >= 4 ? "#ABD1C6" : "#f0c040",
            backgroundColor: evaluation.score >= 4 ? "#f6faf8" : "#fffdf5",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold">AI 评价</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="h-5 w-5"
                  fill={s <= evaluation.stars ? "#f0c040" : "none"}
                  color={s <= evaluation.stars ? "#f0c040" : "#ccc"}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {evaluation.score}/5
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant={evaluation.semanticCorrect ? "default" : "destructive"}>
              语义{evaluation.semanticCorrect ? "正确 ✅" : "有误 ❌"}
            </Badge>
            <Badge variant={evaluation.grammarCorrect ? "default" : "destructive"}>
              语法{evaluation.grammarCorrect ? "正确 ✅" : "有误 ❌"}
            </Badge>
            <Badge
              variant={
                evaluation.naturalness === "natural"
                  ? "default"
                  : evaluation.naturalness === "okay"
                    ? "secondary"
                    : "destructive"
              }
            >
              {evaluation.naturalness === "natural"
                ? "地道自然"
                : evaluation.naturalness === "okay"
                  ? "基本自然"
                  : "不太自然"}
            </Badge>
            {evaluation.creativeBonus && (
              <Badge variant="secondary">🌟 创意加分</Badge>
            )}
          </div>

          <p className="text-sm mb-2">{evaluation.comment}</p>
          {evaluation.suggestedImprovement && evaluation.suggestedImprovement !== "已经很好了" && (
            <p className="text-sm text-muted-foreground">
              💬 {evaluation.suggestedImprovement}
            </p>
          )}
        </div>
      )}

      {/* 输入区 */}
      {!evaluation ? (
        <div className="space-y-4">
          <Textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder={`用 "${word.word}" 造一个英语句子...`}
            className="min-h-[80px] text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!sentence.trim() || loading}
            className="w-full px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 评价中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> 提交评判
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2.5 rounded-xl border font-medium transition-all hover:scale-105 flex items-center gap-2"
            style={getBtnStyle("vocab:retry")}
          >
            <RefreshCw className="h-4 w-4" /> 修改重试
          </button>
          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center gap-2"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {isLastWord ? "🎯 完成造句" : "下一个词"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
