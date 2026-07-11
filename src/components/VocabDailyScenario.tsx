"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getBtnStyle } from "@/lib/button-colors";
import { readSSE } from "@/lib/stream";
import type { WordItem, ScenarioTurnResult } from "@/types";

interface Props {
  sessionId: string;
  topic: string;
  words: WordItem[];
  initialTurns: ScenarioTurnResult[];
  onDone: (turns: ScenarioTurnResult[]) => void;
}

export function VocabDailyScenario({
  sessionId,
  topic,
  words,
  initialTurns,
  onDone,
}: Props) {
  const [turns, setTurns] = useState<ScenarioTurnResult[]>(initialTurns);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null); // AI 正在输入的文本
  const [completed, setCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 从已有 turns 中提取已使用的词汇（只信任 AI 判定，用户消息中的乐观标记不作为权威来源）
  const usedWordsSet = new Set<string>();
  turns.forEach((t) => {
    if (t.role === "ai") {
      t.usedWords?.forEach((w) => usedWordsSet.add(w));
    }
  });

  const allUsedWords = Array.from(usedWordsSet);
  const unusedWords = words.filter((w) => !usedWordsSet.has(w.word));
  const totalUsed = allUsedWords.length;
  const allWordsList = words.map((w) => w.word);

  // 自动滚到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  // 检测是否全部完成
  useEffect(() => {
    if (totalUsed >= 5 && !completed) {
      setCompleted(true);
    }
  }, [totalUsed, completed]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || loading) return;

    // 检测用户消息中是否包含了目标词汇（发送给后端作为参考，但最终由 AI 判定）
    const usedInMessage: string[] = [];
    words.forEach((w) => {
      if (
        !usedWordsSet.has(w.word) &&
        message.toLowerCase().includes(w.word.toLowerCase())
      ) {
        usedInMessage.push(w.word);
        // 不再本地乐观标记，等待 AI 判定后再标记为已使用
      }
    });

    // 立即添加用户消息到对话
    const userTurn: ScenarioTurnResult = {
      role: "user",
      content: message.trim(),
      usedWords: usedInMessage,
      allUsedWords: [],
      completed: false,
    };

    setTurns((prev) => [...prev, userTurn]);
    setMessage("");
    setLoading(true);
    setStreamingText(""); // 开始流式接收 AI 回复

    try {
      const res = await fetch("/api/vocab/daily/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "respond",
          message: userTurn.content,
          usedWords: usedInMessage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "请求失败" }));
        toast.error(data.error || "请求失败");
        setStreamingText(null);
        setLoading(false);
        return;
      }

      // SSE 流式接收 AI 回复（打字机效果）
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          setStreamingText((prev) => (prev || "") + event.content);
        } else if (event.type === "done") {
          const data = event.result as ScenarioTurnResult;
          const aiTurn: ScenarioTurnResult = {
            role: data.role,
            content: data.content,
            usedWords: data.usedWords || [],
            allUsedWords: data.allUsedWords || [],
            completed: data.completed || false,
            review: data.review,
          };

          setTurns((prev) => [...prev, aiTurn]);
          setStreamingText(null);

          if (aiTurn.completed) {
            setCompleted(true);
          }
        } else if (event.type === "error") {
          toast.error(event.message);
          setStreamingText(null);
        }
      }
    } catch {
      toast.error("网络错误");
      setStreamingText(null);
    } finally {
      setLoading(false);
    }
  }, [message, loading, sessionId, words, usedWordsSet]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setStreamingText("");
    try {
      const res = await fetch("/api/vocab/daily/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "start" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "启动场景失败" }));
        toast.error(data.error || "启动场景失败");
        setStreamingText(null);
        setLoading(false);
        return;
      }

      // SSE 流式接收
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          setStreamingText((prev) => (prev || "") + event.content);
        } else if (event.type === "done") {
          const data = event.result as ScenarioTurnResult;
          setTurns([data]);
          setStreamingText(null);
        } else if (event.type === "error") {
          toast.error(event.message);
          setStreamingText(null);
        }
      }
    } catch {
      toast.error("网络错误");
      setStreamingText(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // 如果是初始状态且没有 turns，自动 start
  useEffect(() => {
    if (turns.length === 0) {
      handleStart();
    }
  }, [turns.length, handleStart]);

  return (
    <div>
      {/* 场景信息 */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-1">🎭 场景挑战</h2>
        <p className="text-sm text-muted-foreground">话题：{topic}</p>
      </div>

      {/* 词汇追踪 */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {words.map((w) => {
          const isUsed = usedWordsSet.has(w.word);
          return (
            <Badge
              key={w.word}
              variant={isUsed ? "default" : "outline"}
              className="text-xs"
              style={
                isUsed
                  ? { backgroundColor: "#ABD1C6", color: "#312F2C", borderColor: "#ABD1C6" }
                  : { borderColor: "#ccc" }
              }
            >
              {isUsed ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
              {w.word}
            </Badge>
          );
        })}
        <span className="text-xs text-muted-foreground ml-1">
          {totalUsed}/5
        </span>
      </div>

      {/* 对话区 */}
      <div
        ref={scrollRef}
        className="border rounded-xl p-4 mb-4 max-h-[50vh] overflow-y-auto space-y-4"
        style={{ borderColor: "#ABD1C6", minHeight: "250px" }}
      >
        {turns.length === 0 && loading && (
          <div className="flex items-center justify-center h-full py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                turn.role === "user"
                  ? "text-white"
                  : "border"
              }`}
              style={
                turn.role === "user"
                  ? { backgroundColor: "#312F2C", color: "#ABD1C6" }
                  : { backgroundColor: "#f8f8f8", borderColor: "#ABD1C6" }
              }
            >
              <p className="leading-relaxed whitespace-pre-wrap">{turn.content}</p>
              {turn.role === "ai" && turn.usedWords && turn.usedWords.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-75">
                  💡 已使用：{turn.usedWords.join(", ")}
                </div>
              )}
              {turn.role === "user" && turn.usedWords && turn.usedWords.length > 0 && (
                <div className="mt-1 text-xs opacity-75">
                  💬 尝试使用：{turn.usedWords.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI 正在输入的流式气泡 */}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm border"
              style={{ backgroundColor: "#f8f8f8", borderColor: "#ABD1C6" }}
            >
              {streamingText === "" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">AI 正在输入...</span>
                </div>
              ) : (
                <p className="leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
                </p>
              )}
            </div>
          </div>
        )}

        {completed && turns.length > 0 && (
          <div
            className="rounded-xl p-5 text-center"
            style={{ backgroundColor: "#eef7f3" }}
          >
            <p className="text-lg font-bold mb-2">🎉 挑战完成！</p>
            <p className="text-sm text-muted-foreground">
              你成功在对话中使用了全部 5 个词汇！
            </p>
            {turns[turns.length - 1]?.review && (
              <div className="mt-3 text-sm border-t pt-3">
                <p className="font-medium mb-1">💬 AI 综合点评</p>
                <p className="text-muted-foreground">
                  {turns[turns.length - 1]!.review}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 输入区 */}
      {!completed && (
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              unusedWords.length > 0
                ? `试试用上 "${unusedWords[0]!.word}"...`
                : "输入你的回复..."
            }
            className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#ABD1C6" }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="px-5 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* 完成后按钮 */}
      {completed && (
        <div className="text-center mt-4">
          <button
            onClick={() => onDone(turns)}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            查看结算 →
          </button>
        </div>
      )}
    </div>
  );
}
