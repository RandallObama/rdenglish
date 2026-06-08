"use client";

import { useEffect, useState, useRef } from "react";

interface LoadingProgressProps {
  loading: boolean;
  label: string;
}

/**
 * 模拟进度条 — 给 AI 请求等待时间增加可视化反馈。
 * 因为 DeepSeek API 是一次性 HTTP 请求，无法获取真实进度，
 * 所以用模拟曲线：起步温和 → 中段放缓 → 末段轻踩刹车。
 * 到达 90% 后锁定不动，API 返回后平滑过渡到 100% 并显示完成。
 */
function tick(current: number): number {
  if (current >= 98) return 98;
  if (current < 40) return current + 1.6;
  if (current < 70) return current + 0.6;
  return current + 0.3;
}

export function LoadingProgress({ loading, label }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      if (startedRef.current) {
        // API 返回 → 平滑过渡到 100% → 短暂停留 → 重置
        setProgress(100);
        setDone(true);
        const timer = setTimeout(() => {
          setProgress(0);
          setDone(false);
          startedRef.current = false;
        }, 800);
        return () => clearTimeout(timer);
      }
      return;
    }

    // 新一轮加载开始
    startedRef.current = true;
    setProgress(0);
    setDone(false);

    const interval = setInterval(() => {
      setProgress((p) => tick(p));
    }, 120);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading && progress === 0) return null;

  return (
    <div className="w-full space-y-2.5 py-2">
      <p className="text-sm text-center text-muted-foreground font-medium">
        {done ? "✅ 完成！" : label}
        {!done && (
          <span className="inline-block w-5 text-left">
            <span className="animate-pulse">…</span>
          </span>
        )}
      </p>
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}
