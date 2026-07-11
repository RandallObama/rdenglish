"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { WordItem, ScenarioTurnResult } from "@/types";
import { VocabDailyDifficultyCheck } from "@/components/VocabDailyDifficultyCheck";
import { VocabDailySentencePractice } from "@/components/VocabDailySentencePractice";
import { VocabDailyScenario } from "@/components/VocabDailyScenario";
import { VocabDailySettlement } from "@/components/VocabDailySettlement";
import { LoadingProgress } from "@/components/LoadingProgress";

type Phase =
  | "loading"
  | "generating"
  | "difficulty_check"
  | "practicing"
  | "scenario_ready"
  | "scenario"
  | "settlement"
  | "completed";

interface SessionData {
  id: string;
  topic: string;
  examType: string;
  difficulty: string;
  status: string;
  words: WordItem[];
  practices: { wordIndex: number; score: number; completed: boolean }[];
  scenarioMessages?: ScenarioTurnResult[];
  usageConsumed: boolean;
}

export function VocabDailyClient() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [scenarioTurns, setScenarioTurns] = useState<ScenarioTurnResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ── 加载今日会话状态 ──
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/vocab/daily/status");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "加载失败");
      }

      if (!data.hasSession) {
        setPhase("generating");
        await generateWords();
        return;
      }

      const s = data.session as SessionData;
      setSession(s);

      switch (s.status) {
        case "generated":
          setPhase("difficulty_check");
          break;
        case "practicing":
          setCurrentWordIndex(s.practices?.filter((p) => p.completed).length || 0);
          setPhase("practicing");
          break;
        case "scenario_ready":
          setPhase("scenario_ready");
          break;
        case "scenario":
          setScenarioTurns(s.scenarioMessages || []);
          setPhase("scenario");
          break;
        case "completed":
          setPhase("settlement");
          break;
        default:
          setPhase("difficulty_check");
      }
    } catch {
      setLoadError(true);
      toast.error("加载失败，请刷新页面重试");
    }
  }, []);

  // ── 生成词汇 ──
  const generateWords = useCallback(
    async (action: "generate" | "adjust" = "generate", newDifficulty?: string) => {
      setGenerating(true);
      setLoadError(false);
      try {
        const res = await fetch("/api/vocab/daily/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            difficulty: newDifficulty,
          }),
        });

        if (res.status === 429) {
          const data = await res.json();
          toast.error(data.error || "请求过于频繁");
          setLoadError(true);
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "生成失败");
          setLoadError(true);
          return;
        }

        setSession({
          id: data.sessionId,
          topic: data.topic,
          examType: data.examType,
          difficulty: data.difficulty,
          status: "generated",
          words: data.words,
          practices: [],
          usageConsumed: false,
        });
        setPhase("difficulty_check");
      } catch {
        setLoadError(true);
        toast.error("网络错误，请稍后重试");
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  // ── 难度确认 ──
  const handleDifficulty = useCallback(
    async (choice: "too_hard" | "too_easy" | "just_right") => {
      if (choice === "just_right") {
        setCurrentWordIndex(0);
        setPhase("practicing");
        return;
      }

      const newDifficulty =
        choice === "too_hard"
          ? session!.difficulty === "hard"
            ? "medium"
            : "easy"
          : session!.difficulty === "easy"
            ? "medium"
            : "hard";

      setGenerating(true);
      try {
        const res = await fetch("/api/vocab/daily/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "adjust",
            difficulty: newDifficulty,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "调整失败");
          return;
        }

        setSession({
          id: data.sessionId,
          topic: data.topic,
          examType: data.examType,
          difficulty: data.difficulty,
          status: "generated",
          words: data.words,
          practices: [],
          usageConsumed: false,
        });
      } catch {
        toast.error("网络错误");
      } finally {
        setGenerating(false);
      }
    },
    [session]
  );

  // ── 造句完成回调 ──
  const handlePracticeDone = useCallback(() => {
    setPhase("scenario_ready");
  }, []);

  // ── 进入场景 ──
  const handleStartScenario = useCallback(() => {
    setScenarioTurns([]);
    setPhase("scenario");
  }, []);

  // ── 跳过场景 ──
  const handleSkipScenario = useCallback(() => {
    setPhase("settlement");
  }, []);

  // ── 场景完成 ──
  const handleScenarioDone = useCallback((turns: ScenarioTurnResult[]) => {
    setScenarioTurns(turns);
    setPhase("settlement");
  }, []);

  // ── 结算完成 ──
  const handleSettlementDone = useCallback(() => {
    setPhase("completed");
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── 渲染各阶段 ──
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">加载失败，请重试</p>
        <button
          onClick={() => {
            setLoadError(false);
            setPhase("loading");
            loadStatus();
          }}
          className="px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105"
          style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
        >
          重新加载
        </button>
      </div>
    );
  }

  if (phase === "loading" || (phase === "generating" && generating)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingProgress loading={true} label="正在生成你的每日词汇..." />
      </div>
    );
  }

  if (phase === "difficulty_check" && session) {
    return (
      <VocabDailyDifficultyCheck
        words={session.words}
        topic={session.topic}
        difficulty={session.difficulty}
        examType={session.examType}
        onSelect={handleDifficulty}
        loading={generating}
      />
    );
  }

  if (phase === "practicing" && session) {
    return (
      <VocabDailySentencePractice
        sessionId={session.id}
        words={session.words}
        currentIndex={currentWordIndex}
        onDone={handlePracticeDone}
      />
    );
  }

  if ((phase === "scenario_ready" || phase === "scenario") && session) {
    if (phase === "scenario_ready") {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">🎉 造句练习全部完成！</h2>
          <p className="text-muted-foreground mb-8">
            你已经为「{session.topic}」的 5 个词汇造了句子。
            <br />
            要不要在真实场景中和 AI 对话，活学活用？
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStartScenario}
              className="px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105"
              style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
            >
              🎭 进入场景挑战
            </button>
            <button
              onClick={handleSkipScenario}
              className="px-6 py-3 rounded-xl border font-bold transition-all hover:scale-105"
              style={{ borderColor: "#312F2C", color: "#312F2C" }}
            >
              跳过，直接结算
            </button>
          </div>
        </div>
      );
    }

    return (
      <VocabDailyScenario
        sessionId={session.id}
        topic={session.topic}
        words={session.words}
        initialTurns={scenarioTurns}
        onDone={handleScenarioDone}
      />
    );
  }

  if ((phase === "settlement" || phase === "completed") && session) {
    return (
      <VocabDailySettlement
        sessionId={session.id}
        words={session.words}
        topic={session.topic}
        scenarioTurns={scenarioTurns}
        isCompleted={phase === "completed"}
        onSave={handleSettlementDone}
      />
    );
  }

  return null;
}
