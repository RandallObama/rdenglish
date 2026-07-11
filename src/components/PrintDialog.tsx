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
import { Printer, Languages, ArrowLeftRight, Minus, Pencil } from "lucide-react";
import { printVocab, type PrintFormat, type LineStyle, type PrintWord } from "@/lib/print-vocab-html";
import { getBtnStyle } from "@/lib/button-colors";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: PrintWord[];
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

interface LineStyleOption {
  value: LineStyle;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const LINE_STYLES: LineStyleOption[] = [
  {
    value: "regular",
    label: "标准横线",
    desc: "4栏紧凑排列，约40词/页",
    icon: <Minus className="h-5 w-5" />,
  },
  {
    value: "four-line-three-grid",
    label: "四线三格",
    desc: "英语书写练习用，约24词/页",
    icon: <Pencil className="h-5 w-5" />,
  },
];

export function PrintDialog({
  open,
  onOpenChange,
  words,
}: PrintDialogProps) {
  const [format, setFormat] = useState<PrintFormat>("cn2en");
  const [lineStyle, setLineStyle] = useState<LineStyle>("regular");
  const [showFirstLetter, setShowFirstLetter] = useState(false);

  function handlePrint() {
    if (words.length === 0) return;

    printVocab(words, format, lineStyle, { showFirstLetter });
    onOpenChange(false);
  }

  // 根据当前线型估算每页词数
  const perPage = lineStyle === "regular" ? 40 : 24;

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

        {/* 书写线样式选择 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">书写格式</p>
          <div className="grid grid-cols-2 gap-2">
            {LINE_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setLineStyle(s.value)}
                className={`
                  flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center
                  transition-colors cursor-pointer
                  ${
                    lineStyle === s.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }
                `}
              >
                <span
                  className={
                    lineStyle === s.value ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {s.icon}
                </span>
                <span className="text-sm font-medium leading-tight">{s.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {s.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 附加选项 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">附加选项</p>

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
        </div>

        {/* 统计 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            共 {words.length} 个单词
          </Badge>
          <Badge variant="outline" className="text-xs">
            约 {Math.ceil(words.length / perPage)} 页
          </Badge>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handlePrint} disabled={words.length === 0} style={getBtnStyle("vocabprint:print")}>
            <Printer className="mr-2 h-4 w-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
