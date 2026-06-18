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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";
import type { FriendItem, SharedContentType } from "@/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: SharedContentType;
  contentId: string;
  onSuccess?: () => void;
}

const typeLabels: Record<SharedContentType, string> = {
  writing: "翻译",
  correction: "批改",
  savedWord: "生词",
  savedGrammar: "语法",
};

export function ShareDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  onSuccess,
}: ShareDialogProps) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setMessage("");
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setFriends(data.friends);
    } catch {
      toast.error("加载好友列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedId) return;
    setSharing(true);
    try {
      const res = await fetch("/api/friends/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedId,
          contentType,
          contentId,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分享失败");
      toast.success("已分享给好友");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "分享失败");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            分享{typeLabels[contentType]}
          </DialogTitle>
          <DialogDescription>
            选择一位好友分享这条内容
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">你还没有好友</p>
            <p className="text-xs text-muted-foreground">
              先去添加好友，再来分享学习内容吧
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 好友列表 */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.friendId}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedId === friend.friendId
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted"
                  }`}
                  onClick={() => setSelectedId(friend.friendId)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {friend.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {friend.name || "未设置昵称"}
                  </span>
                </button>
              ))}
            </div>

            {/* 留言 */}
            <div>
              <Textarea
                placeholder="给好友留言（选填）"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {message.length}/200
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedId || sharing || friends.length === 0}
            style={getBtnStyle("share:send")}
          >
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            分享
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
