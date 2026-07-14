"use client";

import { Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import type { WordItem } from "@/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  words: WordItem[];
  topic: string;
  difficulty: string;
  examType: string;
  onSelect: (choice: "too_hard" | "too_easy" | "just_right") => void;
  onChangeTopic: () => void;
  topicChangeCount: number;
  loading: boolean;
}

const DIFF_LABELS: Record<string, string> = {
  easy: "初级",
  medium: "中级",
  hard: "高级",
};

const EXAM_LABELS: Record<string, string> = {
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  general: "通用",
  literary: "文学",
};

export function VocabDailyDifficultyCheck({
  words,
  topic,
  difficulty,
  examType,
  onSelect,
  onChangeTopic,
  topicChangeCount,
  loading,
}: Props) {
  return (
    <div>
      {/* 标题区 */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">📖 今日 5 词</h1>
        <p className="text-muted-foreground mb-3">
          话题：<span className="font-semibold">{topic}</span>
        </p>
        <div className="flex gap-2 justify-center">
          <Badge variant="secondary">
            {EXAM_LABELS[examType] || examType}
          </Badge>
          <Badge variant="outline">
            {DIFF_LABELS[difficulty] || difficulty} 难度
          </Badge>
        </div>
      </div>

      {/* 5 个词汇卡片 */}
      <div className="space-y-4 mb-8">
        {words.map((w, i) => (
          <div
            key={w.word}
            className="border rounded-xl p-5 transition-all hover:shadow-md"
            style={{ borderColor: "#ABD1C6" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">{w.word}</span>
                  {(w.phoneticUK || w.phoneticUS) && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {w.phoneticUK && `UK /${w.phoneticUK}/`}
                      {w.phoneticUK && w.phoneticUS && w.phoneticUK !== w.phoneticUS && " "}
                      {w.phoneticUS && w.phoneticUS !== w.phoneticUK && `US /${w.phoneticUS}/`}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {w.chinese}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {w.partOfSpeech}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {w.definition}
                </p>
                <div className="text-sm">
                  <span className="font-medium">搭配：</span>
                  {w.collocations.map((c, j) => (
                    <span key={j}>
                      {j > 0 && " · "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {c}
                      </code>
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-2xl font-bold text-muted-foreground/30">
                {i + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 难度确认按钮 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          这些单词的难度适合你吗？
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => onSelect("too_hard")}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border-2 font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ borderColor: "#e74c3c", color: "#e74c3c" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsDown className="h-4 w-4" />
            )}
            难度太大
          </button>
          <button
            onClick={() => onSelect("just_right")}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp className="h-4 w-4" />
            )}
            难度合适，马上造句
          </button>
          <button
            onClick={() => onSelect("too_easy")}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border-2 font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ borderColor: "#3498db", color: "#3498db" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            难度太小
          </button>
        </div>

        {/* 换话题按钮 */}
        <div className="mt-4">
          <button
            onClick={onChangeTopic}
            disabled={loading || topicChangeCount >= 3}
            className="px-4 py-2 rounded-xl border-2 font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2 mx-auto"
            style={{
              borderColor: "#ABD1C6",
              color: topicChangeCount >= 3 ? "#999" : "#312F2C",
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            换话题
          </button>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {topicChangeCount >= 3
              ? "今日次数已用完"
              : `今日剩余 ${3 - topicChangeCount}/3 次`}
          </p>
        </div>
      </div>
    </div>
  );
}
