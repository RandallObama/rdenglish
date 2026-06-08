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
import { Loader2, Send, GraduationCap, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
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
};

export function Writer({ onResult, onError }: WriterProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<string>("daily");
  const [examType, setExamType] = useState<string>("general");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          style,
          examType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        onError(data.error || "翻译失败");
        return;
      }

      onResult(data);
    } catch {
      onError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
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
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-xs h-8">
          {text.length}/2000 字
        </Badge>
      </div>

      <Textarea
        placeholder="在这里输入你想翻译的中文内容...&#10;比如：随着互联网的普及，越来越多的人开始关注网络安全问题。"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[180px] sm:min-h-[200px] text-base resize-y"
        maxLength={2000}
      />

      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在深度分析...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            开始翻译与分析
          </>
        )}
      </Button>
    </div>
  );
}
