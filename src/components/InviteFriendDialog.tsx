"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { FriendItem } from "@/types";

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordbookId: string;
  memberIds: string[];
  onSuccess?: () => void;
}

export function InviteFriendDialog({
  open,
  onOpenChange,
  wordbookId,
  memberIds,
  onSuccess,
}: InviteFriendDialogProps) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      // 排除已是成员的
      setFriends(data.friends.filter((f: FriendItem) => !memberIds.includes(f.friendId)));
    } catch {
      toast.error("加载好友列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    setInvitingId(friendId);
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "邀请失败");
      toast.success("已邀请好友加入单词本");
      setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "邀请失败");
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            邀请好友
          </DialogTitle>
          <DialogDescription>
            好友将直接加入单词本，一起背单词
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              没有可邀请的好友（可能都已在单词本中）
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friendId}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {friend.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {friend.name || "未设置昵称"}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={invitingId === friend.friendId}
                  onClick={() => handleInvite(friend.friendId)}
                >
                  {invitingId === friend.friendId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "邀请"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
