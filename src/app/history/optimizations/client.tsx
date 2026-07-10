"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Loader2, Sparkles, ArrowLeft, Gauge, PenLine, GraduationCap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";
import type { OptimizationRecord } from "@/types";

const styleLabels: Record<string, string> = {
  daily: "日常英语",
  academic: "学术英语",
  business: "商务英语",
  creative: "创意写作",
  persuasive: "议论文",
};

const examLabels: Record<string, string> = {
  general: "通用",
  middle: "中考",
  high: "高考",
  cet4: "四级",
  cet6: "六级",
  ielts: "雅思/托福",
  literary: "文学批评",
};

const intensityLabels: Record<string, string> = {
  light: "轻度优化",
  medium: "中度优化",
  deep: "深度优化",
};

export default function OptimizationHistoryClient() {
  const [records, setRecords] = useState<OptimizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/optimize/history?page=${page}&pageSize=10`);

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          throw new Error("加载失败");
        }

        const data = await res.json();
        if (!cancelled) {
          setRecords(data.items);
          setTotalPages(data.totalPages);
        }
      } catch {
        if (!cancelled) {
          toast.error("加载优化记录失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/history" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">优化记录</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查看所有英文写作优化历史
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无优化记录</p>
            <Link href="/optimize" className={buttonVariants({ variant: "outline", className: "mt-4" })} style={getBtnStyle("history:start-optimize")}>开始优化</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {records.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(record.createdAt).toLocaleString("zh-CN")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <PenLine className="h-3 w-3" />
                      {styleLabels[record.style] || record.style}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {examLabels[record.examType] || record.examType}
                    </Badge>
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Gauge className="h-3 w-3" />
                      {intensityLabels[record.intensity] || record.intensity}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <span className="text-[10px] text-muted-foreground uppercase">原文</span>
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded px-2 py-1">
                      {record.originalText.slice(0, 200)}
                      {record.originalText.length > 200 ? "..." : ""}
                    </p>
                  </div>

                  <div className="mb-3">
                    <span className="text-[10px] text-muted-foreground uppercase">优化后</span>
                    <p className="text-xs line-clamp-2 bg-primary/5 rounded px-2 py-1">
                      {record.optimizedText.slice(0, 200)}
                      {record.optimizedText.length > 200 ? "..." : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      {record.improvements.length} 处改进
                      {record.highlights && ` — ${record.highlights.slice(0, 50)}...`}
                    </span>
                    <Link href={`/optimize?view=${record.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-xs" })}>查看详情</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
