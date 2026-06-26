"use client";

/**
 * ChallengeView — 周末挑战主界面
 *
 * 三步流程：选择难度 → 写作 → 结果
 * 状态由 URL searchParams 持久化（step + difficulty / submissionId）
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Trophy,
  ArrowLeft,
  Send,
  FileText,
  BarChart3,
} from "lucide-react";
import { ChallengeResult } from "@/components/ChallengeResult";
import { getBtnStyle } from "@/lib/button-colors";
import type { CorrectionResult } from "@/types";

// ── 类型 ──

interface ChallengeData {
  id: string;
  date: string;
  difficulty: string;
  topic: string;
  prompt: string;
  wordLimit: number;
  timeLimit: number;
  submission: {
    id: string;
    score: number;
    maxScore: number;
  } | null;
}

interface SubmitResult extends CorrectionResult {
  id: string;
  challengeId: string;
  wordCount: number;
  timeSpent: number;
  remaining: number;
}

// ── 难度标签 ──

const DIFFICULTY_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  easy: { label: "简单", color: "#ABD1C6", desc: "120-150词 · 30分钟" },
  hard: { label: "困难", color: "#E07B7B", desc: "250+词 · 40分钟" },
};

// ── 主组件 ──

export function ChallengeView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const step = searchParams.get("step") || "select";

  const [data, setData] = useState<ChallengeData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        if (d.challenges) setData(d.challenges);
        else if (d.error) setError(d.error);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayChallenges = (data || []).filter((c) => c.date === today);

  // 根据 URL 参数渲染不同步骤
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{error || "加载失败"}</p>
      </div>
    );
  }

  if (todayChallenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Trophy className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">本周挑战尚未发布</p>
        <p className="text-sm text-muted-foreground">周六周日回来看看吧</p>
      </div>
    );
  }

  switch (step) {
    case "select":
      return <SelectDifficulty challenges={todayChallenges} />;
    case "write": {
      const difficulty = searchParams.get("difficulty") || "easy";
      const challenge = todayChallenges.find((c) => c.difficulty === difficulty);
      if (!challenge) {
        return <SelectDifficulty challenges={todayChallenges} />;
      }
      if (challenge.submission) {
        return <ShowResult challenge={challenge} submissionId={challenge.submission.id} />;
      }
      return <WriteChallenge challenge={challenge} />;
    }
    case "result": {
      const submissionId = searchParams.get("submissionId");
      const challenge = todayChallenges.find(
        (c) => c.submission?.id === submissionId
      );
      if (!challenge || !submissionId) {
        return <SelectDifficulty challenges={todayChallenges} />;
      }
      return <ShowResult challenge={challenge} submissionId={submissionId} />;
    }
    default:
      return <SelectDifficulty challenges={todayChallenges} />;
  }
}

// ── 步骤 1：选择难度 ──

function SelectDifficulty({ challenges }: { challenges: ChallengeData[] }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">周末写作挑战</h1>
        <p className="text-muted-foreground mt-2">
          {today} · 选择难度开始挑战
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {challenges.map((ch) => {
          const info = DIFFICULTY_LABELS[ch.difficulty] || DIFFICULTY_LABELS.easy;
          const btnStyle = getBtnStyle(`challenge:${ch.difficulty}`);
          const done = !!ch.submission;

          return (
            <Card
              key={ch.id}
              className={`relative ${done ? "opacity-75" : "hover:shadow-lg transition-shadow"}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    style={{
                      backgroundColor: info.color,
                      color: "#312F2C",
                    }}
                  >
                    {info.label}
                  </Badge>
                  {done && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      已完成
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-2">
                  话题：{ch.topic}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {ch.prompt}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {info.desc}
                  </span>
                </div>

                {done ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push(
                        `/challenge?step=result&submissionId=${ch.submission!.id}`
                      )
                    }
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    查看结果 ({ch.submission!.score}/{ch.submission!.maxScore})
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    style={{
                      backgroundColor: btnStyle.backgroundColor,
                      color: btnStyle.color,
                    }}
                    onClick={() =>
                      router.push(
                        `/challenge?step=write&difficulty=${ch.difficulty}`
                      )
                    }
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    选择此难度
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── 步骤 2：写作 ──

function WriteChallenge({ challenge }: { challenge: ChallengeData }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit * 60);
  const [submitting, setSubmitting] = useState(false);
  const [streamText, setStreamText] = useState("");
  const startTimeRef = useRef(Date.now());

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0 || submitting) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch("/api/challenges/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, content, timeSpent }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "提交失败");
        setSubmitting(false);
        return;
      }

      // SSE 流式读取
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: SubmitResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(trimmed.slice(6));
            if (event.type === "chunk") {
              setStreamText((prev) => prev + event.content);
            } else if (event.type === "done") {
              finalResult = event.result;
            } else if (event.type === "error") {
              alert(event.message);
              setSubmitting(false);
              return;
            }
          } catch {}
        }
      }

      if (finalResult) {
        router.push(
          `/challenge?step=result&submissionId=${finalResult.id}`
        );
      }
    } catch (e) {
      alert("提交失败，请重试");
      setSubmitting(false);
    }
  }, [content, submitting, challenge.id, router]);

  const info = DIFFICULTY_LABELS[challenge.difficulty] || DIFFICULTY_LABELS.easy;

  // 提交中 — 显示流式批改
  if (submitting) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-center">正在批改...</h1>
        <Card>
          <CardContent className="p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
              {streamText || "AI 正在分析你的作文..."}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/challenge?step=select")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回选择
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            style={{ backgroundColor: info.color, color: "#312F2C" }}
          >
            {info.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{challenge.date}</span>
        </div>
      </div>

      <Separator />

      {/* 题目 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              话题：{challenge.topic}
            </span>
            <span className="text-xs text-muted-foreground">
              目标 {challenge.wordLimit} 词
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {challenge.prompt}
          </p>
        </CardContent>
      </Card>

      {/* 计时器 + 写作区 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock
                className={`h-4 w-4 ${
                  timeLeft < 60 ? "text-red-500 animate-pulse" : "text-muted-foreground"
                }`}
              />
              <span
                className={`font-mono text-sm ${
                  timeLeft < 60 ? "text-red-500" : ""
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              已写 {content.trim().split(/\s+/).filter(Boolean).length} 词
            </span>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在这里写下你的作文..."
            className="min-h-[300px] font-sans text-sm leading-relaxed"
            disabled={timeLeft <= 0}
          />

          <div className="flex justify-end gap-2">
            {timeLeft > 0 && (
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                style={getBtnStyle("challenge:submit")}
              >
                <Send className="h-4 w-4 mr-2" />
                提交批改
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 步骤 3：查看结果 ──

function ShowResult({
  challenge,
  submissionId,
}: {
  challenge: ChallengeData;
  submissionId: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/challenges/submissions?pageSize=50`)
      .then((r) => r.json())
      .then((d) => {
        const found = d.items?.find((s: any) => s.id === submissionId);
        if (found) {
          setResult({
            id: found.id,
            challengeId: found.challengeId,
            totalScore: found.score,
            maxScore: found.maxScore,
            scores: found.scores,
            sentenceCorrections: [],
            grammarIssues: [],
            vocabSuggestions: [],
            improvementSuggestions: [],
            overallComment: "",
            wordCount: found.wordCount,
            timeSpent: found.timeSpent,
            remaining: 0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [submissionId]);

  // 如果有完整的 feedback JSON，直接从 submit API 过来的
  // 从 history API 获取的数据可能没有完整 feedback，需要重新获取
  useEffect(() => {
    if (!result || result.overallComment) return;
    // 从 submission 详情获取完整内容
    fetch(`/api/challenges/submissions`)
      .then((r) => r.json())
      .then((d) => {
        const found = d.items?.find((s: any) => s.id === submissionId);
        if (found) {
          // 尝试解析完整 feedback
          // submission API 返回的是列表摘要，不包含完整 feedback
          // 这里我们直接显示已有的分数维度信息
        }
      });
  }, [submissionId, result]);

  const info = DIFFICULTY_LABELS[challenge.difficulty] || DIFFICULTY_LABELS.easy;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">结果不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/challenge?step=select")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回选择
        </Button>
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: info.color, color: "#312F2C" }}>
            {info.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{challenge.date}</span>
        </div>
      </div>

      <Separator />

      {/* 题目回顾 */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            话题：{challenge.topic}
          </p>
          <p className="text-sm whitespace-pre-wrap">{challenge.prompt}</p>
        </CardContent>
      </Card>

      <ChallengeResult
        result={result}
        difficulty={challenge.difficulty}
        date={challenge.date}
        topic={challenge.topic}
        submissionId={submissionId}
      />
    </div>
  );
}
