"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, FileDown, Loader2 } from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  filenamePrefix?: string;
}

export function PdfPreviewModal({
  open,
  onClose,
  html,
  filenamePrefix = "单词默写纸",
}: PdfPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  async function handleDownload() {
    if (!iframeRef.current?.contentDocument) {
      alert("预览未加载完成，请稍后重试");
      return;
    }

    setGenerating(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const iframeDoc = iframeRef.current.contentDocument;
      const papers = iframeDoc.querySelectorAll<HTMLElement>(".paper");

      if (papers.length === 0) {
        alert("没有可下载的内容");
        setGenerating(false);
        return;
      }

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const pageWidth = 210;
      const pageHeight = 297;

      let isFirst = true;

      for (const paper of papers) {
        const canvas = await html2canvas(paper, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#EFECE6",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (!isFirst) {
          pdf.addPage();
        }
        isFirst = false;

        pdf.addImage(
          imgData,
          "JPEG",
          0,
          0,
          pageWidth,
          pageHeight,
          undefined,
          "FAST"
        );
      }

      const now = new Date();
      const ts = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      pdf.save(`${filenamePrefix}_${ts}.pdf`);
    } catch (err) {
      alert(
        "PDF 生成失败: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/70">
      {/* 工具栏 */}
      <div className="flex items-center justify-between shrink-0 px-5 py-3 bg-[#312F2C] text-[#EFECE6] shadow-lg">
        <span className="text-sm font-semibold tracking-wide">
          📝 默写纸预览
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border border-white/20 text-[#EFECE6] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            关闭
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-60"
            style={getBtnStyle("pdfpreview:download")}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {generating ? "生成中..." : "下载 PDF"}
          </button>
        </div>
      </div>

      {/* iframe 预览区 —— CSS 完全隔离，无 oklch 泄漏 */}
      <div className="flex-1 overflow-auto">
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="默写纸预览"
          sandbox="allow-scripts allow-same-origin"
          className="w-full border-0"
          style={{ minHeight: "100%", display: "block" }}
        />
      </div>
    </div>
  );
}
