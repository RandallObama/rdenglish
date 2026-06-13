"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { toast } from "sonner";
import { Loader2, Sparkles, Lightbulb, X } from "lucide-react";
import type { GrammarExercise } from "@/types";

interface GrammarExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPoints: string[];
  onClearSelection: () => void;
}

export function GrammarExercisesDialog({
  open,
  onOpenChange,
  selectedPoints,
  onClearSelection,
}: GrammarExercisesDialogProps) {
  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [generating, setGenerating] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!open || selectedPoints.length === 0) return;

    async function generate() {
      setGenerating(true);
      setExercises([]);

      try {
        const res = await fetch("/api/grammar-patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: selectedPoints }),
        });

        if (res.status === 401) {
          toast.error("请先登录");
          onOpenChange(false);
          return;
        }

        if (res.status === 429) {
          toast.error("今日免费次数已用完");
          onOpenChange(false);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "生成失败");
          return;
        }

        setExercises(data.exercises || []);
        setRemaining(data.remaining ?? null);
      } catch {
        toast.error("网络错误");
      } finally {
        setGenerating(false);
      }
    }

    generate();
  }, [open, selectedPoints, onOpenChange]);

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            针对性练习
          </DialogTitle>
          <DialogDescription>
            针对你选择的语法点生成练习题
          </DialogDescription>
        </DialogHeader>

        {/* 已选语法点 */}
        <div className="flex gap-1.5 flex-wrap">
          {selectedPoints.map((point) => (
            <Badge key={point} variant="secondary">
              {point}
            </Badge>
          ))}
        </div>

        {/* 生成中 */}
        {generating && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                正在生成练习题...
              </p>
            </div>
          </div>
        )}

        {/* 空结果 */}
        {!generating && exercises.length === 0 && (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              暂无练习题，请重试或选择其他语法点
            </p>
          </div>
        )}

        {/* 练习题列表 */}
        {!generating && exercises.length > 0 && (
          <div className="space-y-3">
            {exercises.map((exercise, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        exercise.type === "fill-blank" ? "default" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {exercise.type === "fill-blank" ? "填空题" : "改错题"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      {exercise.point}
                    </Badge>
                  </div>

                  <p className="text-sm mb-1">
                    {exercise.type === "fill-blank" ? (
                      <>
                        {exercise.question.split("____").map((part, idx, arr) => (
                          <span key={idx}>
                            {part}
                            {idx < arr.length - 1 && (
                              <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs font-mono border">
                                ____
                              </code>
                            )}
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        {exercise.question}
                      </span>
                    )}
                  </p>

                  <CollapsibleSection
                    summary={
                      <span className="text-xs text-muted-foreground">
                        查看答案与解析
                      </span>
                    }
                  >
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                        ✅ 正确答案
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-300">
                        {exercise.answer}
                      </p>
                    </div>
                    <div className="mt-2 p-3 bg-muted/50 rounded">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        💡 解析
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.explanation}
                      </p>
                    </div>
                  </CollapsibleSection>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground mr-auto">
              今日剩余 {remaining} 次
            </p>
          )}
          <Button variant="outline" onClick={onClearSelection}>
            <X className="mr-2 h-4 w-4" />
            清空选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
