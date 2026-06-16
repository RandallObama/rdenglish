"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserX, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { FriendItem } from "@/types";

interface FriendsListProps {
  onSearchTab?: () => void;
}

export function FriendsList({ onSearchTab }: FriendsListProps) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.status === 401) return;
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setFriends(data.friends);
    } catch {
      toast.error("加载好友列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleRemove = async (friendshipId: string, friendName: string | null) => {
    setRemovingId(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
      toast.success(`已删除好友${friendName ? `「${friendName}」` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">还没有好友</h3>
          <p className="text-muted-foreground text-sm mb-4">
            去搜索好友的昵称，添加学习伙伴吧
          </p>
          {onSearchTab && (
            <Button variant="outline" onClick={onSearchTab}>
              <UserPlus className="h-4 w-4 mr-2" />
              搜索好友
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        共 {friends.length} 位好友
      </p>
      {friends.map((friend) => (
        <Card key={friend.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {friend.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{friend.name || "未设置昵称"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(friend.addedAt).toLocaleDateString("zh-CN")} 成为好友
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={removingId === friend.id}
              onClick={() => handleRemove(friend.id, friend.name)}
            >
              {removingId === friend.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">删除</span>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
