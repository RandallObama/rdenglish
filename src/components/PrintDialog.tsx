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
import { Eye, Languages, ArrowLeftRight, FileDown } from "lucide-react";
import { generatePrintHtml, getWordsPerPage, type PrintFormat, type PrintWord } from "@/lib/print-vocab-html";
import { getBtnStyle } from "@/lib/button-colors";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";

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

export function PrintDialog({
  open,
  onOpenChange,
  words,
}: PrintDialogProps) {
  const [format, setFormat] = useState<PrintFormat>("cn2en");
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  function handlePreview() {
    if (words.length === 0) return;

    const html = generatePrintHtml(words, format, { showFirstLetter });
    setPreviewHtml(html);
    setPreviewOpen(true);
    onOpenChange(false);
  }

  // 每页固定 20 词
  const perPage = getWordsPerPage();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            生成单词默写纸
          </DialogTitle>
          <DialogDescription>
            选择排版格式后点击预览，在预览页确认无误即可下载 PDF
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
          <Button onClick={handlePreview} disabled={words.length === 0} style={getBtnStyle("vocabprint:preview")}>
            <Eye className="mr-2 h-4 w-4" />
            预览默写纸
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <PdfPreviewModal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      html={previewHtml}
    />
    </>
  );
}
