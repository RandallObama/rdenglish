"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordbookId: string;
  onSuccess?: () => void;
}

export function AddWordDialog({
  open,
  onOpenChange,
  wordbookId,
  onSuccess,
}: AddWordDialogProps) {
  const [word, setWord] = useState("");
  const [chinese, setChinese] = useState("");
  const [level, setLevel] = useState("");
  const [usage, setUsage] = useState("");
  const [adding, setAdding] = useState(false);

  const reset = () => {
    setWord("");
    setChinese("");
    setLevel("");
    setUsage("");
  };

  const handleAdd = async () => {
    if (!word.trim() || !chinese.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          chinese: chinese.trim(),
          level: level || undefined,
          usage: usage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "添加失败");
      toast.success(`已添加「${word.trim()}」`);
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            添加单词
          </DialogTitle>
          <DialogDescription>
            添加一个新单词到共享单词本
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="aw-word">单词 *</label>
              <Input
                id="aw-word"
                placeholder="如：ubiquitous"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="aw-chinese">中文释义 *</label>
              <Input
                id="aw-chinese"
                placeholder="如：无处不在的"
                value={chinese}
                onChange={(e) => setChinese(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="aw-level">等级</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="aw-level">
                <SelectValue placeholder="选择等级（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="基础">基础</SelectItem>
                <SelectItem value="进阶">进阶</SelectItem>
                <SelectItem value="高级">高级</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="aw-usage">用法</label>
            <Input
              id="aw-usage"
              placeholder="如：形容词，常用于正式文体"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleAdd} disabled={!word.trim() || !chinese.trim() || adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
