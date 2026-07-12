"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { WordItem, DictationState } from "@/types";

interface Props {
  sessionId: string;
  words: WordItem[];
  initialDictationState?: DictationState;
  onDone: () => void;
}

export function VocabDailyDictation({
  sessionId,
  words,
  initialDictationState,
  onDone,
}: Props) {
  // ── 队列状态 ──
  const [remainingIndices, setRemainingIndices] = useState<number[]>(() =>
    initialDictationState?.remainingIndices ?? words.map((_, i) => i)
  );
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>(
    initialDictationState?.hintsUsed ?? {}
  );
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{
    status: "correct" | "incorrect";
    correctAnswer: string;
  } | null>(null);
  const [completed, setCompleted] = useState(
    () => (initialDictationState?.remainingIndices?.length ?? 5) === 0
  );
  const [saving, setSaving] = useState(false);

  // 统计（用 ref 避免频繁渲染，完成时再展示）
  const totalAttemptsRef = useRef(0);
  const errorCountRef = useRef(0);
  const [finalStats, setFinalStats] = useState<{ attempts: number; errors: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSaveDone = useRef(false);

  // ── 派生值 ──
  const currentIndex = remainingIndices[0];
  const currentWord = currentIndex !== undefined ? words[currentIndex] : null;
  const totalWords = words.length;
  const completedCount = totalWords - remainingIndices.length;
  const hasHint = currentIndex !== undefined && hintsUsed[String(currentIndex)];
  const progressPct = Math.round((completedCount / totalWords) * 100);

  // ── 持久化 ──
  const saveState = useCallback(
    async (remaining: number[], hints: Record<string, boolean>) => {
      try {
        await fetch("/api/vocab/daily/dictation", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            dictationState: {
              remainingIndices: remaining,
              hintsUsed: hints,
            },
          }),
        });
      } catch {
        // 静默失败 — 刷新后可恢复
      }
    },
    [sessionId]
  );

  // ── 首次挂载：若无初始状态则立即持久化（触发 API 自动转 status → "dictation"）──
  useEffect(() => {
    if (!initialDictationState && !initialSaveDone.current) {
      initialSaveDone.current = true;
      const initialRemaining = words.map((_, i) => i);
      saveState(initialRemaining, {});
    }
  }, [initialDictationState, words, saveState]);

  // ── 提交 ──
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !currentWord || feedback || saving) return;

    totalAttemptsRef.current += 1;

    const isCorrect =
      input.trim().toLowerCase() === currentWord.word.toLowerCase();
    const newRemaining = [...remainingIndices];

    if (isCorrect) {
      newRemaining.shift();
      setFeedback({ status: "correct", correctAnswer: currentWord.word });
    } else {
      errorCountRef.current += 1;
      const failed = newRemaining.shift()!;
      newRemaining.push(failed);
      setFeedback({ status: "incorrect", correctAnswer: currentWord.word });
    }

    setRemainingIndices(newRemaining);
    saveState(newRemaining, hintsUsed);

    if (newRemaining.length === 0) {
      // 记录统计数据，但不立即显示完成页 — 让用户先看到最后一个反馈
      setFinalStats({
        attempts: totalAttemptsRef.current,
        errors: errorCountRef.current,
      });
    }
  }, [input, currentWord, feedback, saving, remainingIndices, hintsUsed, saveState]);

  // ── 下一词 / 查看结果 ──
  const handleNext = useCallback(() => {
    if (remainingIndices.length === 0) {
      // 队列为空 → 最后一个单词已通过，显示完成界面
      setFeedback(null);
      setCompleted(true);
      return;
    }
    setInput("");
    setFeedback(null);
    // 聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [remainingIndices.length]);

  // ── 显示首字母提示 ──
  const handleHint = useCallback(() => {
    if (!currentWord || hasHint) return;
    const newHints = { ...hintsUsed, [String(currentIndex)]: true };
    setHintsUsed(newHints);
    saveState(remainingIndices, newHints);
  }, [currentWord, hasHint, currentIndex, hintsUsed, remainingIndices, saveState]);

  // ── 完成 → 结算 ──
  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/vocab/daily/dictation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, completed: true }),
      });
    } catch {
      toast.error("保存失败，请稍后重试");
      setSaving(false);
      return;
    }
    setSaving(false);
    onDone();
  }, [sessionId, onDone]);

  // ── 首字母提示的视觉展示 ──
  const hintDisplay =
    hasHint && currentWord
      ? `${currentWord.word[0]} ${"_ ".repeat(currentWord.word.length - 1).trim()}`
      : null;

  // ── 键盘事件 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (feedback) {
          handleNext();
        } else {
          handleSubmit();
        }
      }
    },
    [feedback, handleNext, handleSubmit]
  );

  // ══════════════════════════════════════════
  // 完成界面
  // ══════════════════════════════════════════
  if (completed) {
    return (
      <div>
        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">📝 默写挑战</h2>
        </div>

        {/* 完成卡片 */}
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#eef7f3" }}
        >
          <p className="text-3xl mb-4">🎉</p>
          <p className="text-xl font-bold mb-2">默写挑战全部通过！</p>
          <p className="text-sm text-muted-foreground mb-4">
            你已正确拼写出全部 {totalWords} 个单词
          </p>

          {finalStats && (
            <div className="flex justify-center gap-6 text-sm mb-6">
              <div>
                <span className="font-bold text-lg">{finalStats.attempts}</span>
                <span className="text-muted-foreground"> 次尝试</span>
              </div>
              <div>
                <span
                  className={`font-bold text-lg ${
                    finalStats.errors === 0 ? "text-green-600" : ""
                  }`}
                >
                  {finalStats.errors}
                </span>
                <span className="text-muted-foreground"> 次错误</span>
              </div>
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {saving ? "保存中..." : "进入结算 →"}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // 默写界面
  // ══════════════════════════════════════════
  return (
    <div>
      {/* ── 头部 ── */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-1">📝 默写挑战</h2>
        <p className="text-sm text-muted-foreground">
          根据英文释义，拼写出正确的单词
        </p>
      </div>

      {/* ── 进度 ── */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-muted-foreground">
            已完成 {completedCount} / {totalWords}
          </span>
          {errorCountRef.current > 0 && (
            <span className="text-xs text-muted-foreground">
              错误 {errorCountRef.current} 次
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: "#ABD1C6",
            }}
          />
        </div>
      </div>

      {/* ── 信息卡 ── */}
      {currentWord && (
        <div
          className="border rounded-xl p-6 mb-4"
          style={{ borderColor: "#ABD1C6" }}
        >
          {/* 词性 */}
          <div className="mb-3">
            <Badge
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: "#ABD1C6", color: "#312F2C" }}
            >
              {currentWord.partOfSpeech}
            </Badge>
          </div>

          {/* 英文释义（大字） */}
          <p className="text-lg font-medium mb-2 leading-relaxed">
            {currentWord.definition}
          </p>

          {/* 中文释义（辅助） */}
          <p className="text-sm text-muted-foreground mb-4">
            {currentWord.chinese}
          </p>

          {/* 首字母提示 */}
          {hintDisplay && (
            <p
              className="text-lg font-mono tracking-widest mb-3"
              style={{ color: "#312F2C" }}
            >
              {hintDisplay}
            </p>
          )}

          {/* 提示按钮 */}
          <button
            onClick={handleHint}
            disabled={hasHint}
            className="text-sm px-4 py-1.5 rounded-lg border transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "#ABD1C6", color: "#312F2C" }}
          >
            💡 {hasHint ? "已显示首字母" : "显示首字母"}
          </button>
        </div>
      )}

      {/* ── 输入区 ── */}
      {!feedback && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入单词拼写..."
            className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#ABD1C6" }}
            autoFocus
            disabled={saving}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || saving}
            className="px-5 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            提交
          </button>
        </div>
      )}

      {/* ── 反馈区 ── */}
      {feedback && (
        <div
          className={`border rounded-xl p-5 ${
            feedback.status === "correct" ? "bg-green-50" : "bg-red-50"
          }`}
          style={{
            borderColor:
              feedback.status === "correct" ? "#86efac" : "#fca5a5",
          }}
        >
          <p className="text-lg font-bold mb-1">
            {feedback.status === "correct" ? "✅ 正确！" : "❌ 拼写错误"}
          </p>
          {feedback.status === "incorrect" && (
            <p className="text-sm mb-3">
              正确拼写：
              <span className="font-bold text-base">{feedback.correctAnswer}</span>
            </p>
          )}
          <button
            onClick={handleNext}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNext();
            }}
            className="px-5 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
            autoFocus
          >
            {remainingIndices.length === 0 ? "查看结果 →" : "下一词 →"}
          </button>
        </div>
      )}
    </div>
  );
}
