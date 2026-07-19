"use client";

import { useState, useCallback } from "react";
import { Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, ArrowDown, ArrowUp, CheckSquare, Square } from "lucide-react";
import type { WordItem } from "@/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  words: WordItem[];
  topic: string;
  difficulty: string;
  examType: string;
  onSelect: (choice: "too_hard" | "too_easy" | "just_right") => void;
  onAdjustWords: (adjustments: Record<number, "easier" | "harder">) => void;
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
  onAdjustWords,
  onChangeTopic,
  topicChangeCount,
  loading,
}: Props) {
  // 每个被勾选的词 → 方向选择（null = 已勾选但未选方向）
  const [adjustments, setAdjustments] = useState<Record<number, "easier" | "harder" | null>>({});

  const handleToggleCheck = useCallback((index: number) => {
    setAdjustments((prev) => {
      const next = { ...prev };
      if (next[index] !== undefined) {
        // 取消勾选 → 清除该词
        delete next[index];
      } else {
        // 勾选但暂不设方向
        next[index] = null;
      }
      return next;
    });
  }, []);

  const handleSetDirection = useCallback((index: number, dir: "easier" | "harder") => {
    setAdjustments((prev) => {
      const next = { ...prev };
      if (next[index] === dir) {
        // 再次点击相同方向 → 取消方向（但保留勾选状态比较怪，改为取消勾选）
        delete next[index];
      } else {
        next[index] = dir;
      }
      return next;
    });
  }, []);

  const handleConfirmAdjust = useCallback(() => {
    const valid: Record<number, "easier" | "harder"> = {};
    for (const [k, v] of Object.entries(adjustments)) {
      if (v) valid[Number(k)] = v;
    }
    if (Object.keys(valid).length > 0) {
      onAdjustWords(valid);
      setAdjustments({});
    }
  }, [adjustments, onAdjustWords]);

  const checkedCount = Object.keys(adjustments).length;
  const hasAnyChecked = checkedCount > 0;
  // 是否所有勾选的词都已选了方向
  const allCheckedHaveDirection = hasAnyChecked && Object.values(adjustments).every(Boolean);

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

      {/* 提示文字 */}
      {!hasAnyChecked && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          勾选想调整的单词，为每个词独立选择变简单还是变难
        </p>
      )}
      {hasAnyChecked && (
        <p className="text-sm text-center mb-4" style={{ color: "#312F2C" }}>
          已勾选 {checkedCount} 个词，请为每个词选择方向
        </p>
      )}

      {/* 5 个词汇卡片 */}
      <div className="space-y-4 mb-8">
        {words.map((w, i) => {
          const isChecked = adjustments[i] !== undefined;
          const direction = adjustments[i];
          const borderColor = direction === "easier"
            ? "#e74c3c"
            : direction === "harder"
              ? "#3498db"
              : isChecked
                ? "#312F2C"
                : "#ABD1C6";

          return (
            <div
              key={w.word}
              className="border rounded-xl p-5 transition-all hover:shadow-md"
              style={{ borderColor, borderWidth: isChecked ? "2px" : "1px" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
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

                  {/* 勾选后的方向按钮 */}
                  {isChecked && (
                    <div className="flex gap-3 mt-3 pt-3 border-t" style={{ borderColor: "#ABD1C6" }}>
                      <button
                        onClick={() => handleSetDirection(i, "easier")}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
                        style={{
                          borderColor: "#e74c3c",
                          color: direction === "easier" ? "#fff" : "#e74c3c",
                          backgroundColor: direction === "easier" ? "#e74c3c" : "transparent",
                        }}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        太简单了
                      </button>
                      <button
                        onClick={() => handleSetDirection(i, "harder")}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
                        style={{
                          borderColor: "#3498db",
                          color: direction === "harder" ? "#fff" : "#3498db",
                          backgroundColor: direction === "harder" ? "#3498db" : "transparent",
                        }}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        太难了
                      </button>
                    </div>
                  )}
                </div>

                {/* 右上角：复选框 */}
                <button
                  onClick={() => handleToggleCheck(i)}
                  disabled={loading}
                  className="flex-shrink-0 p-1 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                  title={isChecked ? "取消选择" : "选择调整此词"}
                >
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5" style={{ color: "#312F2C" }} />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部按钮区 */}
      <div className="text-center">
        {/* 确认替换按钮（有勾选且有方向时显示） */}
        {allCheckedHaveDirection && (
          <div className="mb-6">
            <button
              onClick={handleConfirmAdjust}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2 mx-auto"
              style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              替换 {checkedCount} 个词汇
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              选中的词将被替换，其余保持不变
            </p>
          </div>
        )}

        {/* 全局按钮（没有勾选时可用） */}
        <p className="text-sm text-muted-foreground mb-4">
          {hasAnyChecked ? "取消所有勾选后可一键调整全部词汇" : "或一键调整全部词汇的难度："}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => onSelect("too_hard")}
            disabled={loading || hasAnyChecked}
            className="px-5 py-2.5 rounded-xl border-2 font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ borderColor: "#e74c3c", color: hasAnyChecked ? "#999" : "#e74c3c" }}
            title={hasAnyChecked ? "请先取消所有勾选" : "全部变简单"}
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
            disabled={loading || hasAnyChecked}
            className="px-5 py-2.5 rounded-xl border-2 font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ borderColor: "#3498db", color: hasAnyChecked ? "#999" : "#3498db" }}
            title={hasAnyChecked ? "请先取消所有勾选" : "全部变难"}
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
