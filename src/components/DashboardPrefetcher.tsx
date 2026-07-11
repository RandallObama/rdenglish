"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Dashboard 数据预取器
 * 在 Dashboard 页面加载后，提前请求用户最可能进入的页面数据。
 * 这样用户点击进入时数据已在缓存中，秒开。
 */
export function DashboardPrefetcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 延迟 200ms 预取，优先保证 Dashboard 本身的渲染
    const timer = setTimeout(() => {
      // 预取每日5词状态
      queryClient.prefetchQuery({
        queryKey: ["vocab-daily", "status"],
        queryFn: () =>
          fetch("/api/vocab/daily/status").then(async (res) => {
            if (!res.ok) throw new Error("prefetch failed");
            return res.json();
          }),
        staleTime: 30_000,
      });

      // 预取语法模式分析
      queryClient.prefetchQuery({
        queryKey: ["grammar-patterns"],
        queryFn: () =>
          fetch("/api/grammar-patterns").then(async (res) => {
            if (!res.ok) throw new Error("prefetch failed");
            return res.json();
          }),
        staleTime: 30_000,
      });

      // 预取报告（本周）
      queryClient.prefetchQuery({
        queryKey: ["report", "week", "", ""],
        queryFn: () =>
          fetch("/api/report?period=week").then(async (res) => {
            if (!res.ok) throw new Error("prefetch failed");
            return res.json();
          }),
        staleTime: 30_000,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [queryClient]);

  return null; // 不渲染任何 UI
}
