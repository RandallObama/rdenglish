"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";
import { AddWordDialog } from "@/components/AddWordDialog";
import {
  Loader2,
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  ArrowLeft,
  Crown,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { WordbookDetail } from "@/types";

export default function WordbookDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const wordbookId = params.id as string;

  const [wb, setWb] = useState<WordbookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);
  const [deletingWb, setDeletingWb] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}`);
      if (res.status === 401) return;
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          toast.error("无权访问该单词本");
          router.push("/wordbooks");
          return;
        }
        throw new Error("加载失败");
      }
      const data = await res.json();
      setWb(data);
    } catch {
      toast.error("加载单词本失败");
    } finally {
      setLoading(false);
    }
  }, [wordbookId, router]);

  useEffect(() => {
    if (status === "authenticated") fetchDetail();
  }, [status, fetchDetail]);

  const handleDeleteWord = async (wordId: string) => {
    setDeletingWordId(wordId);
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/words/${wordId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success("已删除单词");
      fetchDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingWordId(null);
    }
  };

  const handleDeleteWordbook = async () => {
    if (!confirm("确定要删除整个单词本吗？所有单词将被删除，此操作不可恢复。")) return;
    setDeletingWb(true);
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success("单词本已删除");
      router.push("/wordbooks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
      setDeletingWb(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wb) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* 返回 + 标题 */}
      <div className="mb-6">
        <Link
          href="/wordbooks"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          返回单词本列表
        </Link>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {wb.name}
              {wb.isOwner && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {wb.wordCount} 个单词 · {wb.memberCount} 位成员
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              邀请好友
            </Button>
            <Button size="sm" onClick={() => setAddWordOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加单词
            </Button>
            {wb.isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDeleteWordbook}
                disabled={deletingWb}
              >
                {deletingWb ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">成员</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {wb.members.map((m) => (
            <Badge key={m.userId} variant={m.role === "owner" ? "default" : "secondary"} className="gap-1.5 py-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[9px]">
                  {m.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {m.name || "未知"}
              {m.role === "owner" && (
                <Crown className="h-3 w-3 ml-0.5" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* 单词列表 */}
      {wb.words.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有单词</h3>
            <p className="text-muted-foreground text-sm mb-4">
              快来添加第一个单词吧
            </p>
            <Button onClick={() => setAddWordOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加单词
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {wb.words.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-primary">
                        {entry.word}
                      </span>
                      {entry.level && (
                        <Badge variant="outline" className="text-xs">
                          {entry.level}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.chinese}</p>
                    {entry.usage && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.usage}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      由 {entry.addedById === session?.user?.id ? "我" : (entry.addedByName || "未知")} 添加
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={deletingWordId === entry.id}
                  onClick={() => handleDeleteWord(entry.id)}
                >
                  {deletingWordId === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <InviteFriendDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        wordbookId={wordbookId}
        memberIds={wb.members.map((m) => m.userId)}
        onSuccess={fetchDetail}
      />
      <AddWordDialog
        open={addWordOpen}
        onOpenChange={setAddWordOpen}
        wordbookId={wordbookId}
        onSuccess={fetchDetail}
      />
    </div>
  );
}
