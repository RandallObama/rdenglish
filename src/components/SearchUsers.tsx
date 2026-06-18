"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search, UserPlus, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";
import type { UserSearchResult } from "@/types";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      if (res.status === 401) return;
      if (!res.ok) throw new Error("搜索失败");
      const data = await res.json();
      setResults(data.users);
    } catch {
      toast.error("搜索失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value.trim()), 300);
  };

  const handleAdd = async (user: UserSearchResult) => {
    setAddingIds((prev) => new Set(prev).add(user.id));
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");
      setAddedIds((prev) => new Set(prev).add(user.id));
      toast.success(`已向「${user.name}」发送好友请求`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="输入好友昵称搜索..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={50}
        />
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 搜索结果 */}
      {!loading && searched && (
        <>
          {results.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">未找到用户</h3>
                <p className="text-muted-foreground text-sm">
                  试试其他昵称关键词吧
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                找到 {results.length} 位用户
              </p>
              {results.map((user) => (
                <Card key={user.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    {addedIds.has(user.id) ? (
                      <Button variant="ghost" size="sm" disabled>
                        <UserCheck className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">已发送</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={addingIds.has(user.id)}
                        onClick={() => handleAdd(user)}
                        style={getBtnStyle("search:add-friend")}
                      >
                        {addingIds.has(user.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">添加好友</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 初始状态（未搜索） */}
      {!loading && !searched && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">搜索好友</h3>
            <p className="text-muted-foreground text-sm">
              输入好友的昵称，找到他们并发送好友请求
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
