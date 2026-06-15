"use client";

import { useState } from "react";
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
import { Send, GraduationCap, Loader2 } from "lucide-react";
import { LoadingProgress } from "@/components/LoadingProgress";
import { useRouter } from "next/navigation";
import { readSSE } from "@/lib/stream";
import type { CorrectionResult, ExamType } from "@/types";

interface EssayCorrectorProps {
  onResult: (result: CorrectionResult & { remaining: number }) => void;
  onError: (error: string) => void;
}

const examLabels: Record<ExamType, string> = {
  general: "通用",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  literary: "文学批评",
};

export function EssayCorrector({ onResult, onError }: EssayCorrectorProps) {
  const [essay, setEssay] = useState("");
  const [examType, setExamType] = useState<string>("general");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!essay.trim() || loading) return;

    setLoading(true);
    setStreamingText("");
    setStreaming(false);

    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay: essay.trim(), examType, stream: true }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "批改失败" }));
        onError(data.error || "批改失败");
        setLoading(false);
        return;
      }

      let firstChunk = false;
      let gotResult = false;
      for await (const event of readSSE(res)) {
        if (event.type === "chunk") {
          if (!firstChunk) {
            firstChunk = true;
            setStreaming(true);
          }
          setStreamingText((prev) => prev + event.content);
        } else if (event.type === "done") {
          gotResult = true;
          onResult(event.result as Parameters<typeof onResult>[0]);
          setStreamingText("");
          setStreaming(false);
        } else if (event.type === "error") {
          onError(event.message);
        }
      }
      if (!gotResult) {
        onError("AI 响应超时，请尝试提交更短的作文或稍后重试");
      }
    } catch {
      onError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="目标考试" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">通用评分</SelectItem>
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
          {essay.trim() ? essay.trim().split(/\s+/).length : 0}/2000 词
        </Badge>
      </div>

      <Textarea
        placeholder="在这里粘贴你的英语作文...&#10;&#10;比如：&#10;Nowadays, with the development of technology, more and more people prefer to shop online. In my opinion, online shopping has both advantages and disadvantages..."
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        className="min-h-[220px] sm:min-h-[250px] text-base resize-y"
      />

      {/* 流式输出 — 使用 LoadingProgress 替代原始 JSON 流 */}
      <LoadingProgress loading={loading && !streaming} label="正在连接 AI..." />
      <LoadingProgress loading={loading && streaming} label="正在深度批改中..." />

      {!loading && (
        <Button
          onClick={handleSubmit}
          disabled={!essay.trim()}
          className="w-full"
          size="lg"
        >
          <Send className="mr-2 h-4 w-4" />
          提交批改
        </Button>
      )}
    </div>
  );
}
