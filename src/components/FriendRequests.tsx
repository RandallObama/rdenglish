"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserCheck, UserX, Clock, Inbox, Send } from "lucide-react";
import { toast } from "sonner";
import type { FriendRequestData } from "@/types";

interface FriendRequestsProps {
  onAccepted?: () => void;
}

export function FriendRequests({ onAccepted }: FriendRequestsProps) {
  const [incoming, setIncoming] = useState<FriendRequestData[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const [inRes, outRes] = await Promise.all([
        fetch("/api/friends/requests?type=incoming"),
        fetch("/api/friends/requests?type=outgoing"),
      ]);
      if (inRes.ok) {
        const data = await inRes.json();
        setIncoming(data.requests);
      }
      if (outRes.ok) {
        const data = await outRes.json();
        setOutgoing(data.requests);
      }
    } catch {
      toast.error("加载好友请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id: string, action: "accept" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");

      if (action === "accept") {
        setIncoming((prev) => prev.filter((r) => r.id !== id));
        toast.success("已添加好友");
        onAccepted?.();
      } else {
        // reject - 对 incoming 是拒绝，对 outgoing 是取消（撤回）
        setIncoming((prev) => prev.filter((r) => r.id !== id));
        setOutgoing((prev) => prev.filter((r) => r.id !== id));
        toast.success(action === "reject" ? "已拒绝" : "已取消");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPending = incoming.length + outgoing.length;
  if (totalPending === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无待处理的好友请求</h3>
          <p className="text-muted-foreground text-sm">
            去搜索好友页面添加新的学习伙伴
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="incoming">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="incoming" className="gap-1">
          <Inbox className="h-4 w-4" />
          收到的请求
          {incoming.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {incoming.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing" className="gap-1">
          <Send className="h-4 w-4" />
          发出的请求
          {outgoing.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {outgoing.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="incoming" className="space-y-3">
        {incoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">暂无收到的请求</p>
            </CardContent>
          </Card>
        ) : (
          incoming.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {req.requesterName?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{req.requesterName || "未设置昵称"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(req.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={processingId === req.id}
                    onClick={() => handleAction(req.id, "accept")}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">接受</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingId === req.id}
                    onClick={() => handleAction(req.id, "reject")}
                  >
                    <UserX className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">拒绝</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="space-y-3">
        {outgoing.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">暂无发出的请求</p>
            </CardContent>
          </Card>
        ) : (
          outgoing.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                      {req.addresseeName?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{req.addresseeName || "未设置昵称"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      等待对方接受
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={processingId === req.id}
                  onClick={() => handleAction(req.id, "reject")}
                >
                  {processingId === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">撤回</span>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
