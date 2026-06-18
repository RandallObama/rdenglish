"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageCircle, ArrowLeft, Send, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/components/ChatContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen } from "lucide-react";
import type { ConversationItem, MessageItem } from "@/types";

export function ChatPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isOpen, initialFriendId, initialFriendName, closeChat } = useChat();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{
    friendId: string;
    friendName: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [viewingContent, setViewingContent] = useState<{
    contentType: string;
    content: Record<string, unknown> | null;
    loading: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = session?.user?.id;

  // 根据 initialFriendId 初始化选中好友
  useEffect(() => {
    if (isOpen && initialFriendId) {
      setSelectedFriend({
        friendId: initialFriendId,
        friendName: initialFriendName || null,
      });
    } else if (!isOpen) {
      setSelectedFriend(null);
      setMessages([]);
    }
  }, [isOpen, initialFriendId, initialFriendName]);

  // 获取会话列表
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setConvLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.status === 401) return;
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // 静默处理
    } finally {
      setConvLoading(false);
    }
  }, [userId]);

  // 获取消息历史
  const fetchMessages = useCallback(
    async (friendId: string) => {
      if (!userId) return;
      setMsgLoading(true);
      try {
        const res = await fetch(`/api/messages/${friendId}?limit=50`);
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setMessages(data.messages || []);

        // 标记已读
        await fetch("/api/messages/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friendId }),
        });
        // 更新会话列表未读数
        setConversations((prev) =>
          prev.map((c) =>
            c.friendId === friendId ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch {
        toast.error("加载消息失败");
      } finally {
        setMsgLoading(false);
      }
    },
    [userId]
  );

  // 初始加载 + 轮询
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    } else {
      setConversations([]);
      setSelectedFriend(null);
      setMessages([]);
    }
  }, [isOpen, fetchConversations]);

  // 选中好友后加载消息 + 开始轮询
  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.friendId);
      // 开始轮询活跃会话
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchMessages(selectedFriend.friendId);
      }, 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setMessages([]);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedFriend?.friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动滚底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedFriend || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedFriend.friendId,
          content: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");

      // 乐观添加消息到列表
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          senderId: userId!,
          receiverId: selectedFriend.friendId,
          content: text,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setInputText("");
      inputRef.current?.focus();

      // 刷新会话列表
      fetchConversations();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  // 键盘发送 (Enter 发送，Shift+Enter 换行)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 从好友列表页直接打开某个好友的聊天
  const handleSelectFriend = (friendId: string, friendName: string | null) => {
    setSelectedFriend({ friendId, friendName });
  };

  // 回到会话列表
  const handleBack = () => {
    setSelectedFriend(null);
    setMessages([]);
    fetchConversations();
  };

  // 格式化时间
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) {
      return d.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString("zh-CN");
  };

  // 查看分享内容详情
  const handleViewContent = async (msgId: string, contentType: string) => {
    setViewingContent({ contentType, content: null, loading: true });
    try {
      const res = await fetch(`/api/messages/content?id=${msgId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingContent({ contentType, content: data.content, loading: false });
      } else {
        setViewingContent({ contentType, content: null, loading: false });
      }
    } catch {
      setViewingContent({ contentType, content: null, loading: false });
    }
  };

  // 格式化分享内容为文本
  const formatContentDetail = (type: string, data: Record<string, unknown> | null): string => {
    if (!data) return "内容已被删除或不可用";
    switch (type) {
      case "writing":
        return `原文：${data.sourceText || ""}\n\n译文：${data.resultText || ""}`;
      case "correction":
        return `作文：${data.essayText || ""}\n\n总分：${data.totalScore || ""}/${data.maxScore || ""}\n\n总评：${data.overallComment || ""}`;
      case "savedWord": {
        let r = `单词：${data.word || ""}\n释义：${data.chinese || ""}`;
        if (data.level) r += `\n等级：${data.level}`;
        if (data.usage) r += `\n用法：${data.usage}`;
        return r;
      }
      case "savedGrammar": {
        let r = `语法点：${data.point || ""}`;
        if (data.level) r += `\n等级：${data.level}`;
        if (data.structure) r += `\n结构：${data.structure}`;
        if (data.explanation) r += `\n解释：${data.explanation}`;
        return r;
      }
      default:
        return "未知内容类型";
    }
  };

  const contentTypeLabel: Record<string, string> = {
    writing: "翻译",
    correction: "批改",
    savedWord: "生词",
    savedGrammar: "语法",
  };

  if (!session) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeChat(); }}>
      <SheetContent showCloseButton={false} className="w-full max-w-sm sm:max-w-sm">
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center justify-between">
            {selectedFriend ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleBack}
                  className="md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SheetTitle>{selectedFriend.friendName || "未设置昵称"}</SheetTitle>
              </div>
            ) : (
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                消息
              </SheetTitle>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeChat}
            >
              <span className="sr-only">关闭</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4">
                <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" />
              </svg>
            </Button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedFriend ? (
            /* ========== 会话列表 ========== */
            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-sm font-medium mb-1">还没有聊天记录</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    去好友列表找朋友聊天吧
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      closeChat();
                      router.push("/friends");
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    前往好友页
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {conversations.map((conv) => (
                    <button
                      key={conv.friendId}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() =>
                        handleSelectFriend(conv.friendId, conv.friendName)
                      }
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {conv.friendName?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {conv.friendName || "未设置昵称"}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 shrink-0 h-4 min-w-[1rem] px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground leading-none">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ========== 聊天界面 ========== */
            <>
              {/* 消息区域 */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center">
                    <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      发送第一条消息吧
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    const isShared = !!msg.contentType;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] ${isShared ? "" : ""}`}>
                          {/* 文字消息（如果有内容） */}
                          {msg.content && (
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm break-words mb-1 ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted text-foreground rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}

                          {/* 分享内容卡片 */}
                          {isShared && (
                            <button
                              type="button"
                              className={`w-full text-left rounded-2xl border-2 px-3.5 py-2.5 transition-colors ${
                                isMe
                                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-br-md"
                                  : "border-border bg-card hover:bg-muted/50 rounded-bl-md"
                              }`}
                              onClick={() =>
                                handleViewContent(msg.id, msg.contentType!)
                              }
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {msg.contentType === "savedWord" || msg.contentType === "savedGrammar" ? (
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">
                                  {contentTypeLabel[msg.contentType!] || "分享内容"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                点击查看详情
                              </p>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="border-t px-3 py-2.5 flex items-end gap-2 shrink-0 bg-popover">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息…"
                  rows={1}
                  maxLength={2000}
                  className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm outline-none focus:border-primary/50 focus:bg-background transition-colors placeholder:text-muted-foreground/60"
                  style={{ maxHeight: "6rem" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 96) + "px";
                  }}
                />
                <Button
                  size="icon-sm"
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="shrink-0 rounded-xl"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* 分享内容详情弹窗 */}
      <Dialog open={!!viewingContent} onOpenChange={() => setViewingContent(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingContent && (
                <Badge variant="outline">
                  {contentTypeLabel[viewingContent.contentType] || "分享内容"}
                </Badge>
              )}
              分享内容详情
            </DialogTitle>
          </DialogHeader>
          {viewingContent?.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap break-words">
              {viewingContent
                ? formatContentDetail(viewingContent.contentType, viewingContent.content)
                : "暂无内容"}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
