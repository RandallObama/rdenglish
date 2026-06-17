"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyCount, ScorePoint, GrammarPattern, DailyVocabCount } from "@/types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

// ── 主题颜色 ──

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    grid: isDark ? "#3A3A3A" : "#E5E5E5",
    text: isDark ? "#999999" : "#777777",
    // 品牌主色：深棕灰 #312F2C（浅色模式）/ 薄荷绿 #ABD1C6（深色模式）
    primary: isDark ? "#ABD1C6" : "#312F2C",
    primaryLight: isDark ? "#C8E5DC" : "#5C5956",
    // 品牌强调色薄荷绿变体 → 用作"改善/成功"
    success: isDark ? "#8BC4B5" : "#6A9E8E",
    warning: isDark ? "#F5B800" : "#E5A000",
    danger: isDark ? "#F07070" : "#E05555",
    background: isDark ? "#1a1a1a" : "#ffffff",
  };
}

// ── 自定义 Tooltip ──

function CustomTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
  label?: string;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => {
        // 优先使用 fullName（语法薄弱点图表中用于显示完整名称）
        const displayName = (entry.payload?.fullName as string) || entry.name;
        return (
          <p key={i} className="text-muted-foreground">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
              style={{ backgroundColor: entry.color }}
            />
            {displayName}: {entry.value}
          </p>
        );
      })}
    </div>
  );
}

// ── 1. 每日翻译柱状图 ──

export function TranslationDailyChart({ data }: { data: DailyCount[] }) {
  const colors = useChartColors();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">每日翻译次数</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, left: -16, right: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip colors={colors} />} />
            <Bar dataKey="count" name="翻译次数" fill={colors.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── 2. 分数趋势折线图 ──

export function ScoreTrendChart({ data }: { data: ScorePoint[] }) {
  const colors = useChartColors();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">分数趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, left: -16, right: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip colors={colors} />} />
            <Line
              type="monotone"
              dataKey="score"
              name="得分"
              stroke={colors.primary}
              strokeWidth={2.5}
              dot={{ r: 4, fill: colors.primary, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: colors.primaryLight, strokeWidth: 2, stroke: colors.background }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── 3. 语法薄弱点水平柱状图 ──

export function GrammarTrendChart({ data }: { data: GrammarPattern[] }) {
  const colors = useChartColors();

  // Recharts 水平柱状图：反转数据 + 限制 Top 8
  const chartData = [...data]
    .slice(0, 8)
    .reverse()
    .map((p) => ({
      name: p.point.length > 8 ? p.point.slice(0, 8) + "…" : p.point,
      fullName: p.point,
      count: p.count,
      trend: p.trend,
    }));

  // 趋势颜色
  const getBarColor = (trend: string) => {
    switch (trend) {
      case "up":
        return colors.danger;
      case "down":
        return colors.success;
      default:
        return colors.primary;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">语法薄弱点 Top 8</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无语法错误数据</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, left: 8, right: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: colors.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: colors.text }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  content={<CustomTooltip colors={colors} />}
                />
                <Bar dataKey="count" name="次数" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <rect key={i} fill={getBarColor(entry.trend)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 趋势图例 */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.danger }} />
                恶化中 <ArrowUp className="h-3 w-3" />
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.success }} />
                改善中 <ArrowDown className="h-3 w-3" />
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.primary }} />
                平稳 <Minus className="h-3 w-3" />
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── 4. 词汇增长双系列柱状图 ──

export function VocabGrowthChart({ data }: { data: DailyVocabCount[] }) {
  const colors = useChartColors();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">每日新增词汇/语法</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, left: -16, right: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip colors={colors} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: colors.text }}
            />
            <Bar
              dataKey="words"
              name="词汇"
              fill={colors.primary}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="grammar"
              name="语法"
              fill={colors.success}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
