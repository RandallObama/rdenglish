"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Send, GraduationCap, PenLine, Sparkles, X, Wand2 } from "lucide-react";
import { LoadingProgress } from "@/components/LoadingProgress";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readSSE } from "@/lib/stream";
import { getBtnStyle } from "@/lib/button-colors";
import type { GrammarNote, VocabNote, ExamType, WritingStyle } from "@/types";

interface WriterProps {
  onResult: (result: {
    id: string;
    english: string;
    grammarNotes: GrammarNote[];
    vocabNotes: VocabNote[];
    remaining: number;
  }) => void;
  onError: (error: string) => void;
}

const examLabels: Record<ExamType, string> = {
  general: "不指定",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  literary: "文学批评",
};

export function Writer({ onResult, onError }: WriterProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<string>("daily");
  const [examType, setExamType] = useState<string>("general");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);

  // 伴写状态
  const [cowriteLoading, setCowriteLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const router = useRouter();
  const cowriteRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭弹出
  useEffect(() => {
    if (!showSuggestions) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cowriteRef.current && !cowriteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setStreamingText("");
    setStreaming(false);

    // 客户端超时保护：Vercel Hobby 限制 10s，这里设置 25s 作为安全上限
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 25000);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), style, examType, stream: true }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "翻译失败" }));
        onError(data.error || "翻译失败");
        return;
      }

      // 消费 SSE 流
      let firstChunk = false;
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          if (!firstChunk) {
            firstChunk = true;
            setStreaming(true);
          }
          setStreamingText((prev) => prev + event.content);
        } else if (event.type === "done") {
          onResult(event.result as Parameters<typeof onResult>[0]);
          setStreamingText("");
          setStreaming(false);
        } else if (event.type === "error") {
          onError(event.message);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        onError("请求超时，请尝试缩短文本或稍后重试");
      } else {
        onError("网络错误，请稍后重试");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setStreaming(false);
    }
  };

  // 续写请求
  const handleCowrite = async () => {
    if (!text.trim() || cowriteLoading) return;

    setCowriteLoading(true);
    setShowSuggestions(false);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000);

    try {
      const res = await fetch("/api/cowrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), style, stream: false }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "续写失败");
        return;
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } else {
        toast.error("未能生成续写建议，请调整上文内容后重试");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("请求超时，请稍后重试");
      } else {
        toast.error("网络错误，请稍后重试");
      }
    } finally {
      clearTimeout(timeoutId);
      setCowriteLoading(false);
    }
  };

  // 选择续写建议
  const handlePickSuggestion = (suggestion: string) => {
    const needsPeriod =
      text.trim() && !text.trim().endsWith("。") && !text.trim().endsWith("！") && !text.trim().endsWith("？");
    setText((prev) => prev + (needsPeriod ? "。" : "") + suggestion);
    setShowSuggestions(false);
    toast.success("已追加续写");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* 写作风格 */}
        <div className="flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="风格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">日常英语</SelectItem>
              <SelectItem value="academic">学术英语</SelectItem>
              <SelectItem value="business">商务英语</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 考试级别 */}
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="考试级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">不指定</SelectItem>
              <SelectItem value="middle">中考</SelectItem>
              <SelectItem value="high">高考</SelectItem>
              <SelectItem value="cet4">四级</SelectItem>
              <SelectItem value="cet6">六级</SelectItem>
              <SelectItem value="ielts">雅思/托福</SelectItem>
              <SelectItem value="literary">文学批评</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-xs h-8">
          {text.length}/1200 字
        </Badge>

        {/* 续写按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCowrite}
          disabled={!text.trim() || cowriteLoading}
          className="h-8 text-xs gap-1.5 ml-auto"
          style={getBtnStyle("writer:cowrite")}
        >
          {cowriteLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              续写中
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              AI 续写
            </>
          )}
        </Button>
      </div>

      {/* 输入区域 + 续写弹出 */}
      <div className="relative" ref={cowriteRef}>
        <Textarea
          placeholder="输入你想翻译的中文内容..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[180px] sm:min-h-[200px] text-base resize-y"
          maxLength={1200}
        />

        {/* 续写建议弹出卡片 */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute right-0 top-0 sm:left-full sm:top-0 sm:ml-3 w-full sm:w-72 z-20 shadow-lg border-primary/20">
            <div className="flex items-center justify-between p-3 pb-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI 续写建议
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="px-3 pb-3 space-y-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePickSuggestion(suggestion)}
                  className="w-full text-left p-2.5 rounded-md border bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm leading-relaxed"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2 shrink-0 align-top mt-0.5">
                    {i + 1}
                  </span>
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 流式输出 — 使用 LoadingProgress 替代原始 JSON 流 */}
      <LoadingProgress loading={loading && !streaming} label="正在连接 AI..." />
      <LoadingProgress loading={loading && streaming} label="正在深度分析中..." />

      {!loading && (
        <Button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full"
          size="lg"
          style={getBtnStyle("writer:submit")}
        >
          <Send className="mr-2 h-4 w-4" />
          开始翻译与分析
        </Button>
      )}
    </div>
  );
}