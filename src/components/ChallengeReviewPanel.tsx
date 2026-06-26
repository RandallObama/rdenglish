"use client";

/**
 * ChallengeReviewPanel — 管理员审核界面。
 *
 * 列出待审核题目，支持通过 / 修改 / 重新生成 / 删除。
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Check,
  X,
  Edit3,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  date: string;
  difficulty: string;
  examType: string;
  topic: string;
  prompt: string;
  wordLimit: number;
  timeLimit: number;
  status: string;
  source: string;
  createdAt: string;
}

const DIFFICULTY_INFO: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "#ABD1C6" },
  hard: { label: "困难", color: "#E07B7B" },
};

const STATUS_INFO: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_review: { label: "待审核", variant: "secondary" },
  approved: { label: "已通过", variant: "default" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

export function ChallengeReviewPanel() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_review");
  const [editTarget, setEditTarget] = useState<Challenge | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editWordLimit, setEditWordLimit] = useState(150);
  const [editTimeLimit, setEditTimeLimit] = useState(30);
  const [saving, setSaving] = useState<string | null>(null);
  const [showApproved, setShowApproved] = useState(false);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/review/challenges?status=${filter}`);
      const data = await res.json();
      if (data.challenges) setChallenges(data.challenges);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const doAction = useCallback(
    async (
      id: string,
      action: "approve" | "reject" | "edit" | "regenerate",
      body?: Record<string, unknown>
    ) => {
      setSaving(id);
      try {
        const res = await fetch(`/api/review/challenges/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(
            action === "approve"
              ? "已通过"
              : action === "reject"
              ? "已拒绝"
              : action === "edit"
              ? "已修改"
              : "已重新生成"
          );
          loadChallenges();
          if (action === "edit") setEditTarget(null);
        } else {
          toast.error(data.error || "操作失败");
        }
      } catch {
        toast.error("操作失败");
      } finally {
        setSaving(null);
      }
    },
    [loadChallenges]
  );

  const pendingChallenges = challenges.filter((c) => c.status === "pending_review");
  const doneChallenges = challenges.filter((c) => c.status !== "pending_review");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">挑战题目审核</h1>
        <div className="flex items-center gap-2">
          {["pending_review", "approved", "rejected", "all"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "pending_review"
                ? "待审核"
                : f === "approved"
                ? "已通过"
                : f === "rejected"
                ? "已拒绝"
                : "全部"}
            </Button>
          ))}
        </div>
      </div>

      {/* 待审核 */}
      {pendingChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-muted-foreground">
            待审核 ({pendingChallenges.length})
          </h2>
          {pendingChallenges.map((ch) => (
            <ChallengeCard
              key={ch.id}
              challenge={ch}
              saving={saving}
              onAction={doAction}
              onEdit={(c) => {
                setEditTarget(c);
                setEditPrompt(c.prompt);
                setEditWordLimit(c.wordLimit);
                setEditTimeLimit(c.timeLimit);
              }}
            />
          ))}
        </div>
      )}

      {pendingChallenges.length === 0 && filter === "pending_review" && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>暂无待审核题目</p>
        </div>
      )}

      {/* 已处理 — 折叠区域 */}
      {doneChallenges.length > 0 && filter !== "pending_review" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowApproved(!showApproved)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {showApproved ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            已处理 ({doneChallenges.length})
          </button>

          {showApproved &&
            doneChallenges.map((ch) => (
              <ChallengeCard
                key={ch.id}
                challenge={ch}
                saving={saving}
                onAction={doAction}
                onEdit={() => {}}
              />
            ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改题目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">题目内容</label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[120px] mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">字数限制</label>
                <Input
                  type="number"
                  value={editWordLimit}
                  onChange={(e) => setEditWordLimit(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">时间限制（分钟）</label>
                <Input
                  type="number"
                  value={editTimeLimit}
                  onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                doAction(editTarget.id, "edit", {
                  prompt: editPrompt,
                  wordLimit: editWordLimit,
                  timeLimit: editTimeLimit,
                });
              }}
            >
              保存并批准
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 单张题目卡片 ──

function ChallengeCard({
  challenge: ch,
  saving,
  onAction,
  onEdit,
}: {
  challenge: Challenge;
  saving: string | null;
  onAction: (id: string, action: "approve" | "reject" | "edit" | "regenerate", body?: Record<string, unknown>) => void;
  onEdit: (ch: Challenge) => void;
}) {
  const info = DIFFICULTY_INFO[ch.difficulty] || DIFFICULTY_INFO.easy;
  const statusInfo = STATUS_INFO[ch.status] || STATUS_INFO.pending_review;
  const busy = saving === ch.id;

  return (
    <Card className={ch.status === "rejected" ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{ch.date}</span>
            <Badge style={{ backgroundColor: info.color, color: "#312F2C" }}>
              {info.label}
            </Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {ch.topic} · {ch.wordLimit}词 · {ch.timeLimit}分钟
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4 whitespace-pre-wrap">{ch.prompt}</p>

        {ch.status === "pending_review" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => onAction(ch.id, "approve")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              通过
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onEdit(ch)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              修改
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction(ch.id, "regenerate")}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              重新生成
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onAction(ch.id, "reject")}
            >
              <X className="h-4 w-4 mr-1" />
              删除
            </Button>
          </div>
        )}

        {ch.status === "approved" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction(ch.id, "reject")}
            >
              取消批准
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
