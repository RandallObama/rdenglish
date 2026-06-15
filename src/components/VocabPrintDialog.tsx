"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Languages, ArrowLeftRight } from "lucide-react";
import { printVocab, type PrintFormat, type PrintOptions } from "@/lib/print-vocab";

interface VocabPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: { word: string; chinese: string; level: string }[];
}

interface FormatOption {
  value: PrintFormat;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const FORMATS: FormatOption[] = [
  {
    value: "cn2en",
    label: "中 → 英默写",
    desc: "看中文释义，默写英文单词",
    icon: <Languages className="h-5 w-5" />,
  },
  {
    value: "en2cn",
    label: "英 → 中默写",
    desc: "看英文单词，默写中文释义",
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
];

export function VocabPrintDialog({
  open,
  onOpenChange,
  words,
}: VocabPrintDialogProps) {
  const [format, setFormat] = useState<PrintFormat>("cn2en");
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const [groupByLevel, setGroupByLevel] = useState(false);
  const [compact, setCompact] = useState(false);

  function handlePrint() {
    if (words.length === 0) return;

    const options: PrintOptions = {
      showFirstLetter,
      groupByLevel,
      compact,
    };

    printVocab(words, format, options);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            打印单词默写纸
          </DialogTitle>
          <DialogDescription>
            选择排版格式后点击打印，通过浏览器「另存为 PDF」即可保存
          </DialogDescription>
        </DialogHeader>

        {/* 翻译方向选择 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">翻译方向</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`
                  flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center
                  transition-colors cursor-pointer
                  ${
                    format === f.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }
                `}
              >
                <span
                  className={
                    format === f.value ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {f.icon}
                </span>
                <span className="text-sm font-medium leading-tight">{f.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {f.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 附加选项 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">附加选项</p>

          {/* 两栏紧凑 */}
          <label className="flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">两栏紧凑</p>
              <p className="text-xs text-muted-foreground">
                左右两栏排列，节省纸张
              </p>
            </div>
          </label>

          {/* 首字母提示（仅中→英时可用） */}
          <label
            className={`
              flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer
              transition-colors
              ${format === "en2cn" ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"}
            `}
          >
            <input
              type="checkbox"
              checked={showFirstLetter}
              onChange={(e) => setShowFirstLetter(e.target.checked)}
              disabled={format === "en2cn"}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">显示首字母提示</p>
              <p className="text-xs text-muted-foreground">
                英文默写栏显示首字母，降低难度
              </p>
            </div>
          </label>

          {/* 按等级分组 */}
          <label className="flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={groupByLevel}
              onChange={(e) => setGroupByLevel(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">按等级分组</p>
              <p className="text-xs text-muted-foreground">
                基础/进阶/高级词汇分区域排列
              </p>
            </div>
          </label>
        </div>

        {/* 统计 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            共 {words.length} 个单词
          </Badge>
          {compact && (
            <Badge variant="outline" className="text-xs">
              左右各 {Math.ceil(words.length / 2)} 词
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handlePrint} disabled={words.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
