"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, HelpCircle, Lightbulb, Check } from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";

export interface GuideStep {
  icon?: React.ReactNode;
  text: string;
}

interface FeatureGuideProps {
  featureKey: string;
  title: string;
  description: string;
  steps: GuideStep[];
  tips?: string[];
}

const STORAGE_PREFIX = "rd_guide_dismissed_";

export function FeatureGuide({
  featureKey,
  title,
  description,
  steps,
  tips,
}: FeatureGuideProps) {
  const storageKey = STORAGE_PREFIX + featureKey;
  const [dismissed, setDismissed] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem(storageKey);
    setDismissed(val === "1");
    setHydrated(true);
  }, [storageKey]);

  const handleDismiss = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, "1");
    }
    setDismissed(true);
  }, [dontShowAgain, storageKey]);

  const handleShow = useCallback(() => {
    setDismissed(false);
  }, []);

  if (!hydrated) return null;

  if (dismissed) {
    return (
      <button
        onClick={handleShow}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        title="查看功能指南"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        如何使用？
      </button>
    );
  }

  const guideCard = (
    <>
      {/* 半透明遮罩层 — 点击关闭，暗色模式加深以保持视觉层次 */}
      <div
        className="fixed inset-0 z-50 bg-black/10 dark:bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* 指南卡片 — 居中浮层 */}
      <Card
        className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border-2 border-primary/20 bg-background overflow-hidden shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部彩色条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: "#ABD1C6" }}
        />

        <div className="p-5 pt-6 max-h-[80vh] overflow-y-auto">
          {/* 标题区 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 flex-shrink-0" style={{ color: "#ABD1C6" }} />
              <div>
                <h3 className="font-bold text-base">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-2.5 mb-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: "#ABD1C6",
                    color: "#312F2C",
                  }}
                >
                  {step.icon ? step.icon : i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step.text}</span>
              </div>
            ))}
          </div>

          {/* 小贴士 */}
          {tips && tips.length > 0 && (
            <div className="bg-muted/60 rounded-md p-3 mb-4">
              <p className="text-xs font-medium mb-1.5" style={{ color: "#312F2C" }}>
                💡 小贴士
              </p>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-[10px] mt-0.5 flex-shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 底部操作区 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded border-2 transition-colors ${
                  dontShowAgain
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                }`}
                onClick={() => setDontShowAgain(!dontShowAgain)}
              >
                {dontShowAgain && <Check className="h-3 w-3" />}
              </span>
              <span className="text-xs text-muted-foreground">不再显示</span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-xs"
              style={getBtnStyle("guide:dismiss")}
            >
              开始使用
            </Button>
          </div>
        </div>
      </Card>
    </>
  );

  return createPortal(guideCard, document.body);
}
