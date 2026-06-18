"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Inbox, Mail, MailOpen, FileText, BookOpen, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { SharedContentItem, SharedContentType } from "@/types";

const contentTypeConfig: Record<
  SharedContentType,
  { label: string; icon: typeof FileText; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  writing: { label: "翻译", icon: FileText, variant: "default" },
  correction: { label: "批改", icon: FileText, variant: "secondary" },
  savedWord: { label: "生词", icon: BookOpen, variant: "outline" },
  savedGrammar: { label: "语法", icon: BookOpen, variant: "outline" },
};

export function SharedInbox() {
  const [items, setItems] = useState<SharedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingItem, setViewingItem] = useState<SharedContentItem | null>(null);
  const [contentDetail, setContentDetail] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/shared?direction=inbox");
      if (res.status === 401) return;
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setItems(data.items);
    } catch {
      toast.error("加载收件箱失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleView = async (item: SharedContentItem) => {
    setViewingItem(item);
    setContentDetail("");
    setDetailLoading(true);

    // 标记已读（通过 PATCH）
    if (!item.read) {
      try {
        await fetch(`/api/friends/shared/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
        );
      } catch {
        // 静默处理
      }
    }

    // 通过统一的 GET /api/friends/shared/[id] 获取内容详情
    try {
      const res = await fetch(`/api/friends/shared/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setContentDetail(formatContent(item.contentType, data.content));
      } else if (res.status === 404) {
        setContentDetail("原内容已被删除或不可用");
      } else {
        setContentDetail("加载详情失败");
      }
    } catch {
      setContentDetail("加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatContent = (type: SharedContentType, data: Record<string, unknown> | null): string => {
    if (!data) return "暂无内容";

    switch (type) {
      case "writing":
        return `原文：${data.sourceText || ""}\n\n译文：${data.resultText || ""}`;
      case "correction":
        return `作文：${data.essayText || ""}\n\n总分：${data.totalScore || ""}/${data.maxScore || ""}\n\n总评：${data.overallComment || ""}`;
      case "savedWord": {
        let result = `单词：${data.word || ""}\n释义：${data.chinese || ""}`;
        if (data.level) result += `\n等级：${data.level}`;
        if (data.usage) result += `\n用法：${data.usage}`;
        const examples = data.examples as string[] | undefined;
        if (examples?.length) result += `\n例句：${examples.join("；")}`;
        return result;
      }
      case "savedGrammar": {
        let result = `语法点：${data.point || ""}`;
        if (data.level) result += `\n等级：${data.level}`;
        if (data.structure) result += `\n结构：${data.structure}`;
        if (data.explanation) result += `\n解释：${data.explanation}`;
        return result;
      }
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">收件箱是空的</h3>
          <p className="text-muted-foreground text-sm">
            好友分享给你的内容会显示在这里
          </p>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <>
      <div className="space-y-3">
        {unreadCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {unreadCount} 条未读
          </p>
        )}
        {items.map((item) => {
          const config = contentTypeConfig[item.contentType] || contentTypeConfig.writing;
          const Icon = config.icon;
          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !item.read ? "border-primary/30 bg-primary/5" : ""
              }`}
              onClick={() => handleView(item)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {item.senderName?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {item.senderName || "未设置昵称"}
                      </p>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={config.variant} className="text-xs py-0 h-5">
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {item.message && (
                        <span className="text-xs text-muted-foreground truncate flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          {item.message}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  {item.read ? (
                    <MailOpen className="h-4 w-4 text-muted-foreground/50" />
                  ) : (
                    <Mail className="h-4 w-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 内容详情弹窗 */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingItem && contentTypeConfig[viewingItem.contentType] && (
                <Badge variant={contentTypeConfig[viewingItem.contentType].variant}>
                  {contentTypeConfig[viewingItem.contentType].label}
                </Badge>
              )}
              来自 {viewingItem?.senderName || "未知"}
            </DialogTitle>
          </DialogHeader>

          {viewingItem?.message && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">留言：</span>
              {viewingItem.message}
            </div>
          )}

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap break-words">
              {contentDetail || "暂无内容"}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
