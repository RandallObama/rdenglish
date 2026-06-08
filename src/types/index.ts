// ========== 语法笔记 ==========
export interface CommonMistake {
  error: string;
  correction: string;
  explanation: string;
}

export interface GrammarNote {
  point: string;
  level: string;
  function: string;
  structure: string;
  explanation: string;
  examples: string[];
  commonMistakes: CommonMistake[];
  examTip?: string;
}

// ========== 词汇笔记 ==========
export interface CommonError {
  error: string;
  correction: string;
  explanation: string;
}

export interface VocabNote {
  word: string;
  chinese: string;
  collocations: string[];
  synonyms: string[];
  level: string;
  usage: string;
  examples: string[];
  commonErrors?: CommonError[];
  examFocus?: string;
}

// ========== 翻译结果 ==========
export interface TranslationResult {
  english: string;
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
}

// ========== 作文批改 ==========
export interface SentenceCorrection {
  original: string;
  revised: string;
  comment: string;
}

export interface ScoreBreakdown {
  content: number;
  structure: number;
  grammar: number;
  vocabulary: number;
}

export interface ImprovementSuggestion {
  suggestion: string;  // 具体优化建议
  reason: string;      // 提出该建议的原因
}

export interface CorrectionResult {
  totalScore: number;
  maxScore: number;
  scores: ScoreBreakdown;
  sentenceCorrections: SentenceCorrection[];
  grammarIssues: GrammarNote[];
  vocabSuggestions: VocabNote[];
  improvementSuggestions: ImprovementSuggestion[];
  overallComment: string;
}

// ========== 历史记录 ==========
export interface WritingRecord {
  id: string;
  sourceText: string;
  resultText: string;
  style: string;
  examType: string;
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
  createdAt: string;
}

export interface CorrectionRecord {
  id: string;
  essayText: string;
  examType: string;
  totalScore: number;
  scores: ScoreBreakdown;
  sentenceCorrections: SentenceCorrection[];
  grammarIssues: GrammarNote[];
  vocabSuggestions: VocabNote[];
  improvementSuggestions: ImprovementSuggestion[];
  overallComment: string;
  createdAt: string;
}

// ========== 笔记本 ==========
export interface SavedWordItem {
  id: string;
  word: string;
  chinese: string;
  collocations: string[];
  synonyms: string[];
  level: string;
  usage: string;
  examples: string[];
  commonErrors?: CommonError[];
  examFocus?: string;
  source: string;
  createdAt: string;
}

export interface SavedGrammarItem {
  id: string;
  point: string;
  level: string;
  function: string;
  structure: string;
  explanation: string;
  examples: string[];
  commonMistakes: CommonMistake[];
  examTip?: string;
  source: string;
  createdAt: string;
}

// ========== 通用 ==========
export interface UsageInfo {
  remaining: number;
  limit: number;
  isPro: boolean;
}

export type WritingStyle = "academic" | "business" | "daily";
export type ExamType = "middle" | "high" | "cet4" | "cet6" | "ielts" | "general";
