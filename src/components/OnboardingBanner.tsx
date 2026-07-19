"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "onboarding-banner-dismissed-at";

export default function OnboardingBanner() {
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setVisible(false);
      return;
    }

    // 已设置英语水平则隐藏
    if (session?.user?.englishLevel) {
      setVisible(false);
      return;
    }

    // 检查 localStorage 是否在 7 天内关闭过
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          setVisible(false);
          return;
        }
      }
    } catch {
      // localStorage 不可用时默认显示
    }

    setVisible(true);
  }, [status, session?.user?.englishLevel]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100 min-w-0">
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">
            请设置你的英语水平，以获得更适合你的每日5词、批改和翻译内容
          </span>
          <span className="sm:hidden">
            请设置你的英语水平
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/profile">
            <Button
              size="sm"
              className="text-xs h-8"
              style={{ backgroundColor: "#312F2C", color: "#ABD1C6" }}
            >
              去设置
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 shrink-0"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
