"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Plus, Users, Crown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getBtnStyle } from "@/lib/button-colors";
import type { WordbookItem } from "@/types";

export default function WordbooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wordbooks, setWordbooks] = useState<WordbookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchWordbooks = useCallback(async () => {
    try {
      const res = await fetch("/api/wordbooks");
      if (res.status === 401) return;
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setWordbooks(data.wordbooks);
    } catch {
      toast.error("加载单词本列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchWordbooks();
  }, [status, fetchWordbooks]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/wordbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      toast.success("单词本已创建");
      setCreateOpen(false);
      setNewName("");
      fetchWordbooks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">共享单词本</h1>
          <p className="text-muted-foreground text-sm mt-1">
            和好友一起背单词，协作建立词库
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} style={getBtnStyle("wordbooks:create")}>
          <Plus className="h-4 w-4 mr-2" />
          创建单词本
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : wordbooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有单词本</h3>
            <p className="text-muted-foreground text-sm mb-4">
              创建一个共享单词本，邀请好友一起背单词
            </p>
            <Button onClick={() => setCreateOpen(true)} style={getBtnStyle("wordbooks:create-first")}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个单词本
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wordbooks.map((wb) => (
            <Link key={wb.id} href={`/wordbooks/${wb.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{wb.name}</p>
                        {wb.isOwner && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        创建者：{wb.isOwner ? "我" : (wb.creatorName || "未知")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{wb.wordCount}</p>
                      <p className="text-xs text-muted-foreground">单词</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{wb.memberCount}</p>
                      <p className="text-xs text-muted-foreground">成员</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* 创建单词本 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>创建单词本</DialogTitle>
            <DialogDescription>
              取一个名字，然后邀请好友一起背单词
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="如：雅思高频词汇"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={30}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={newName.trim().length < 2 || creating} style={getBtnStyle("wordbooks:create-confirm")}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
