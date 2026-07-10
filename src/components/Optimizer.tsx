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
import { Loader2, Send, GraduationCap, PenLine, Sparkles, X, Wand2, Gauge, Scissors } from "lucide-react";
import { LoadingProgress } from "@/components/LoadingProgress";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readSSE } from "@/lib/stream";
import { getBtnStyle } from "@/lib/button-colors";
import type { GrammarNote, VocabNote, ImprovementItem, TransitionAnalysis, OptimizeStyle, ExamType, OptimizeIntensity } from "@/types";

interface OptimizerProps {
  onResult: (result: {
    id: string;
    optimizedText: string;
    improvements: ImprovementItem[];
    grammarNotes: GrammarNote[];
    vocabNotes: VocabNote[];
    highlights: string;
    transitionAnalysis?: TransitionAnalysis;
    remaining: number;
  }) => void;
  onError: (error: string) => void;
}

const styleLabels: Record<OptimizeStyle, string> = {
  daily: "日常英语",
  academic: "学术英语",
  business: "商务英语",
  creative: "创意写作",
  persuasive: "议论文",
};

const examLabels: Record<ExamType, string> = {
  general: "不指定",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  literary: "文学批评",
};

const intensityLabels: Record<OptimizeIntensity, { label: string; desc: string }> = {
  light: { label: "轻度", desc: "仅纠正语法拼写" },
  medium: { label: "中度", desc: "语法+词汇+逻辑" },
  deep: { label: "深度", desc: "全方位改写提升" },
};

export function Optimizer({ onResult, onError }: OptimizerProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<string>("daily");
  const [examType, setExamType] = useState<string>("general");
  const [intensity, setIntensity] = useState<string>("medium");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);

  // 片段选择
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 续写状态
  const [cowriteLoading, setCowriteLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cowriteRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // 点击外部关闭续写弹窗
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

  // 检测文本选中
  const handleSelectionChange = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      setSelectedRange({ start, end });
    } else {
      setSelectedRange(null);
    }
  };

  const handleSubmit = async (fragmentMode: boolean = false) => {
    const textToProcess = fragmentMode && selectedRange
      ? text.slice(selectedRange.start, selectedRange.end)
      : text;

    if (!textToProcess.trim() || loading) return;

    setLoading(true);
    setStreamingText("");
    setStreaming(false);
    setSelectedRange(null);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 60000);

    try {
      const body: Record<string, unknown> = {
        text: textToProcess.trim(),
        style,
        examType,
        intensity,
        mode: fragmentMode ? "fragment" : "full",
        stream: true,
      };

      if (fragmentMode && selectedRange) {
        body.contextBefore = text.slice(0, selectedRange.start);
        body.contextAfter = text.slice(selectedRange.end);
      }

      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "优化失败" }));
        onError(data.error || "优化失败");
        return;
      }

      let firstChunk = false;
      let finalResult: Parameters<typeof onResult>[0] | null = null;
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          if (!firstChunk) {
            firstChunk = true;
            setStreaming(true);
          }
          setStreamingText((prev) => prev + event.content);
        } else if (event.type === "done") {
          finalResult = event.result as Parameters<typeof onResult>[0];

          // 片段模式：自动替换原选区
          if (fragmentMode && selectedRange && finalResult) {
            const before = text.slice(0, selectedRange.start);
            const after = text.slice(selectedRange.end);
            const newFullText = before + finalResult.optimizedText + after;
            setText(newFullText);
          }

          onResult(finalResult!);
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

  // 英文续写
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
        body: JSON.stringify({ text: text.trim(), style, lang: "en", stream: false }),
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
    const separator = text.trim() && !text.endsWith(" ") ? " " : "";
    setText((prev) => prev + separator + suggestion);
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
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="风格" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(styleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 考试级别 */}
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="考试级别" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(examLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 优化力度 */}
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={intensity} onValueChange={setIntensity}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="力度" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(intensityLabels).map(([value, { label, desc }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                  <span className="text-[10px] text-muted-foreground ml-1.5">{desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-xs h-8">
          {text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0}/1200 词
        </Badge>

        {/* 续写按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCowrite}
          disabled={!text.trim() || cowriteLoading}
          className="h-8 text-xs gap-1.5 ml-auto"
          style={getBtnStyle("optimizer:cowrite")}
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
          ref={textareaRef}
          placeholder="粘贴或输入你的英文文本..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelectedRange(null);
          }}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          className="min-h-[200px] sm:min-h-[220px] text-base resize-y"
        />

        {/* 片段优化浮动按钮 */}
        {selectedRange && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="h-8 text-xs gap-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2"
              style={getBtnStyle("optimizer:fragment")}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  优化中...
                </>
              ) : (
                <>
                  <Scissors className="h-3.5 w-3.5" />
                  优化选中片段 ({text.slice(selectedRange.start, selectedRange.end).trim().split(/\s+/).filter(Boolean).length} 词)
                </>
              )}
            </Button>
          </div>
        )}

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

      {/* 流式加载指示器 */}
      <LoadingProgress loading={loading && !streaming} label="正在连接 AI..." />
      <LoadingProgress loading={loading && streaming} label="正在深度优化中..." />

      {/* 全文优化按钮 */}
      <Button
        onClick={() => handleSubmit(false)}
        disabled={!text.trim() || loading}
        className="w-full"
        size="lg"
        style={getBtnStyle("optimizer:submit")}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            优化中...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            开始{intensity === "light" ? "轻度" : intensity === "medium" ? "中度" : "深度"}优化
          </>
        )}
      </Button>
    </div>
  );
}
