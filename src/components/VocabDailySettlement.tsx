"use client";

import { useState, useCallback } from "react";
import { Loader2, Star, Save, BookOpen, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getBtnStyle } from "@/lib/button-colors";
import type { WordItem, ScenarioTurnResult } from "@/types";

interface Props {
  sessionId: string;
  words: WordItem[];
  topic: string;
  scenarioTurns: ScenarioTurnResult[];
  isCompleted: boolean;
  onSave: () => void;
}

export function VocabDailySettlement({
  sessionId,
  words,
  topic,
  scenarioTurns,
  isCompleted,
  onSave,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(words.map((w) => w.word))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isCompleted);

  const toggleWord = useCallback((word: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }, []);

  // 从 scenario turns 中提取每个词的使用评分
  const wordUsageMap: Record<string, boolean> = {};
  scenarioTurns.forEach((t) => {
    t.usedWords?.forEach((w) => {
      wordUsageMap[w] = true;
    });
  });

  const handleSave = useCallback(async () => {
    if (checked.size === 0) {
      toast("没有选中任何单词");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let skipCount = 0;

    for (const word of checked) {
      const wordData = words.find((w) => w.word === word);
      if (!wordData) continue;

      try {
        const res = await fetch("/api/notebook/word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: wordData.word,
            chinese: wordData.chinese,
            phoneticUK: wordData.phoneticUK || "",
            phoneticUS: wordData.phoneticUS || "",
            collocations: wordData.collocations,
            level: sessionStorage.getItem(`vocab-difficulty-${sessionId}`) || "",
            usage: wordData.usage,
            examples: [wordData.example],
            source: "vocab-daily",
          }),
        });

        if (res.status === 409) {
          skipCount++;
        } else if (res.ok) {
          successCount++;
        }
      } catch {
        // 静默处理单个失败
      }
    }

    setSaving(false);
    setSaved(true);

    if (successCount > 0) {
      toast.success(
        `已保存 ${successCount} 个单词到生词本${skipCount > 0 ? `，${skipCount} 个已收藏` : ""}`
      );
    } else if (skipCount > 0) {
      toast("这些单词已在生词本中");
    } else {
      toast.error("保存失败，请稍后重试");
    }

    onSave();
  }, [checked, words, sessionId, onSave]);

  return (
    <div>
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {saved ? "🎉 今日学习完成！" : "📋 学习结算"}
        </h1>
        <p className="text-muted-foreground">
          话题「{topic}」· 点击勾选要加入生词本的单词
        </p>
      </div>

      {/* 5 词清单 */}
      <div className="space-y-3 mb-8">
        {words.map((w, i) => {
          const isChecked = checked.has(w.word);
          const wasUsed = wordUsageMap[w.word];

          return (
            <div
              key={w.word}
              onClick={() => toggleWord(w.word)}
              className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                isChecked ? "ring-2" : "opacity-75 hover:opacity-100"
              }`}
              style={{
                borderColor: isChecked ? "#ABD1C6" : "#e5e5e5",
              }}
            >
              <div className="flex items-start gap-3">
                {/* 勾选框 */}
                <div
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isChecked
                      ? "border-transparent"
                      : "border-muted-foreground/30"
                  }`}
                  style={{
                    backgroundColor: isChecked ? "#ABD1C6" : "transparent",
                  }}
                >
                  {isChecked && (
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="#312F2C"
                      strokeWidth="2"
                    >
                      <path d="M1 6l3 3 7-7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-lg">{w.word}</span>
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
                    {wasUsed && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: "#ABD1C6", color: "#312F2C" }}
                      >
                        场景已用
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{w.usage}</p>
                  {w.etymology && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📚 {w.etymology}
                    </p>
                  )}
                </div>

                <span className="text-2xl font-bold text-muted-foreground/20">
                  {i + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!saved && (
          <button
            onClick={handleSave}
            disabled={saving || checked.size === 0}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> 保存到生词本（{checked.size}）
              </>
            )}
          </button>
        )}

        {saved && (
          <>
            <a
              href="/notebook"
              className="px-5 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
              style={getBtnStyle("vocab:notebook")}
            >
              <BookOpen className="h-4 w-4" /> 查看生词本
            </a>
            <a
              href="/dashboard"
              className="px-5 py-3 rounded-xl border font-medium transition-all hover:scale-105 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> 返回首页
            </a>
          </>
        )}
      </div>
    </div>
  );
}
