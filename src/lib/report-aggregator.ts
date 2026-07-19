import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { format } from "date-fns/format";
import { buildPatternMap, computeTrend } from "@/lib/grammar-patterns";
import type {
  ReportData,
  ReportPeriod,
  ReportPeriodType,
  TranslationStats,
  CorrectionStats,
  VocabGrowthStats,
  DailyCount,
  ScorePoint,
  DailyVocabCount,
  GrammarPattern,
} from "@/types";

// ── 聚合参数 ──

export interface AggregationParams {
  writings: { style: string; createdAt: Date }[];
  corrections: {
    totalScore: number;
    maxScore: number;
    grammarIssues: string;
    examType: string;
    createdAt: Date;
  }[];
  savedWords: { createdAt: Date }[];
  savedGrammars: { createdAt: Date }[];
  startDate: Date;
  endDate: Date;
  periodType: ReportPeriodType;
}

// ── 翻译统计 ──

function aggregateTranslations(
  writings: { style: string; createdAt: Date }[],
  startDate: Date,
  endDate: Date
): TranslationStats {
  const total = writings.length;
  const byStyle: Record<string, number> = {};

  // 按日期分组计数
  const dateCountMap = new Map<string, number>();

  for (const w of writings) {
    const style = w.style || "daily";
    byStyle[style] = (byStyle[style] || 0) + 1;

    const dateKey = format(w.createdAt, "yyyy-MM-dd");
    dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
  }

  // 填充所有日期（包括零次的天）
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyCounts: DailyCount[] = days.map((d) => ({
    date: format(d, "MM-dd"),
    count: dateCountMap.get(format(d, "yyyy-MM-dd")) || 0,
  }));

  return { total, byStyle, dailyCounts };
}

// ── 批改统计 ──

function aggregateCorrections(
  corrections: AggregationParams["corrections"]
): CorrectionStats {
  const total = corrections.length;
  const byExamType: Record<string, number> = {};

  if (total === 0) {
    return {
      total: 0,
      averageScore: 0,
      maxScore: 0,
      scoreTrend: [],
      byExamType: {},
    };
  }

  const scoreTrend: ScorePoint[] = [];
  let maxNormalized = 0;
  let sumNormalized = 0;

  for (const c of corrections) {
    const normalized = c.maxScore > 0 ? Math.round((c.totalScore / c.maxScore) * 100) : 0;
    sumNormalized += normalized;
    if (normalized > maxNormalized) maxNormalized = normalized;

    const examType = c.examType || "general";
    byExamType[examType] = (byExamType[examType] || 0) + 1;

    scoreTrend.push({
      date: format(c.createdAt, "yyyy-MM-dd"),
      score: normalized,
    });
  }

  const averageScore = Math.round(sumNormalized / total);

  return { total, averageScore, maxScore: maxNormalized, scoreTrend, byExamType };
}

// ── 词汇增长统计 ──

function aggregateVocabGrowth(
  savedWords: { createdAt: Date }[],
  savedGrammars: { createdAt: Date }[],
  startDate: Date,
  endDate: Date
): VocabGrowthStats {
  const newWords = savedWords.length;
  const newGrammar = savedGrammars.length;

  const wordDateMap = new Map<string, number>();
  for (const w of savedWords) {
    const key = format(w.createdAt, "yyyy-MM-dd");
    wordDateMap.set(key, (wordDateMap.get(key) || 0) + 1);
  }

  const grammarDateMap = new Map<string, number>();
  for (const g of savedGrammars) {
    const key = format(g.createdAt, "yyyy-MM-dd");
    grammarDateMap.set(key, (grammarDateMap.get(key) || 0) + 1);
  }

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyAdded: DailyVocabCount[] = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      date: format(d, "MM-dd"),
      words: wordDateMap.get(key) || 0,
      grammar: grammarDateMap.get(key) || 0,
    };
  });

  return { newWords, newGrammar, dailyAdded };
}

// ── 语法模式转换（复用 grammar-patterns） ──

function buildGrammarPatterns(
  corrections: AggregationParams["corrections"]
): { patterns: GrammarPattern[]; totalIssues: number } {
  const patternMap = buildPatternMap(
    corrections.map((c) => ({
      grammarIssues: c.grammarIssues,
      createdAt: c.createdAt,
    }))
  );

  const patterns: GrammarPattern[] = [];

  for (const [point, data] of patternMap) {
    const sortedDates = [...data.dates].sort();
    const trend = computeTrend(sortedDates);
    const firstOccurred = sortedDates[0];
    const lastOccurred = sortedDates[sortedDates.length - 1];
    const firstMs = new Date(firstOccurred).getTime();
    const lastMs = new Date(lastOccurred).getTime();
    const totalSpan = Math.max(0, Math.ceil((lastMs - firstMs) / (1000 * 60 * 60 * 24)));

    patterns.push({
      point,
      count: data.dates.length,
      firstOccurred,
      lastOccurred,
      trend,
      totalSpan,
      avgPerMonth:
        totalSpan > 0
          ? Math.round((data.dates.length / (totalSpan / 30)) * 10) / 10
          : data.dates.length,
      levels: [...data.levels],
      sampleMistakes: data.mistakes,
    });
  }

  patterns.sort((a, b) => b.count - a.count);

  const totalIssues = patterns.reduce((sum, p) => sum + p.count, 0);

  return { patterns, totalIssues };
}

// ── 主入口 ──

export function buildReportAggregation(params: AggregationParams): ReportData {
  const { writings, corrections, savedWords, savedGrammars, startDate, endDate, periodType } =
    params;

  const period: ReportPeriod = {
    type: periodType,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  const translationStats = aggregateTranslations(writings, startDate, endDate);
  const correctionStats = aggregateCorrections(corrections);
  const vocabGrowth = aggregateVocabGrowth(savedWords, savedGrammars, startDate, endDate);
  const { patterns: grammarPatterns, totalIssues: totalGrammarIssues } =
    buildGrammarPatterns(corrections);

  return {
    period,
    translationStats,
    correctionStats,
    grammarPatterns,
    totalGrammarIssues,
    vocabGrowth,
    generatedAt: new Date().toISOString(),
  };
}
