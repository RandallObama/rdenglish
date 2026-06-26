"use client";

/**
 * WeekendChallengeBadge — Dashboard 上的周末挑战入口。
 *
 * 周四-周五：灰色 "周末挑战预告" 标签
 * 周六-周日且未完成：彩色 "周末挑战进行中 🔥" 按钮
 * 周六-周日且已完成：显示 "今日得分 xx/xx ✅"
 * 周一-周三：不显示
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Clock } from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";

interface ChallengeSummary {
  id: string;
  date: string;
  difficulty: string;
  topic: string;
  prompt: string;
  wordLimit: number;
  timeLimit: number;
  submission: {
    id: string;
    score: number;
    maxScore: number;
  } | null;
}

export function WeekendChallengeBadge() {
  const [data, setData] = useState<{
    challenges: ChallengeSummary[];
    saturday: string;
    sunday: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        if (d.challenges) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data || data.challenges.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const saturday = data.saturday;
  const sunday = data.sunday;

  // 周一-周三不显示
  if (today < saturday) {
    const todayDate = new Date(today);
    const satDate = new Date(saturday);
    const diffDays = Math.ceil(
      (satDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 周四、周五显示预告
    if (diffDays <= 2 && diffDays >= 0) {
      return (
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>周末挑战预告 · {diffDays === 0 ? "明天" : `${diffDays}天后`}开始</span>
          </div>
        </div>
      );
    }
    return null;
  }

  // 周末（周六或周日）
  const todayChallenges = data.challenges.filter(
    (c) => c.date === today
  );

  if (todayChallenges.length === 0) return null;

  const btnStyle = getBtnStyle("challenge:badge");

  // 检查今天是否已完成
  const completed = todayChallenges.find((c) => c.submission);
  const allCompleted = todayChallenges.every((c) => c.submission);

  if (allCompleted) {
    // 今天所有难度都完成了
    const best = todayChallenges.reduce(
      (best, c) =>
        c.submission && c.submission.score > best.score
          ? { score: c.submission.score, maxScore: c.submission.maxScore }
          : best,
      { score: 0, maxScore: 15 }
    );

    return (
      <div className="mt-8 flex justify-center">
        <Link
          href="/challenge"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
          style={{
            color: btnStyle.color,
            backgroundColor: btnStyle.backgroundColor,
          }}
        >
          <Trophy className="h-4 w-4" />
          <span>
            今日得分 {best.score}/{best.maxScore} ✅
          </span>
        </Link>
      </div>
    );
  }

  if (completed) {
    // 完成了一个难度，还有一个没做
    return (
      <div className="mt-8 flex justify-center">
        <Link
          href="/challenge"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
          style={{
            color: btnStyle.color,
            backgroundColor: btnStyle.backgroundColor,
          }}
        >
          <Trophy className="h-4 w-4" />
          <span>今日得分 {completed.submission!.score}/{completed.submission!.maxScore} · 再挑战另一个难度</span>
        </Link>
      </div>
    );
  }

  // 还没做
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href="/challenge"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg animate-pulse"
        style={{
          color: btnStyle.color,
          backgroundColor: btnStyle.backgroundColor,
        }}
      >
        <Trophy className="h-4 w-4" />
        <span>🔥 周末挑战进行中</span>
      </Link>
    </div>
  );
}
