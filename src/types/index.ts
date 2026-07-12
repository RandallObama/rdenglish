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
  /** 英式音标（IPA格式，如 /ˈfəʊ.tə.ɡrɑːf/） */
  phoneticUK?: string;
  /** 美式音标（IPA格式，如 /ˈfoʊ.t̬ə.ɡræf/） */
  phoneticUS?: string;
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
  /** 逐句翻译质量点评 */
  sentenceReviews?: SentenceTranslationReview[];
}

/** 逐句翻译点评 */
export interface SentenceTranslationReview {
  sourceSentence: string;     // 中文原句
  translatedSentence: string;  // 对应英文翻译
  quality: string;             // 质量评价（中文）
  suggestions?: string;        // 改进建议（如有）
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

export interface ScoringRationale {
  content: string;
  structure: string;
  grammar: string;
  vocabulary: string;
}

export interface CorrectionResult {
  totalScore: number;
  maxScore: number;
  scores: ScoreBreakdown;
  scoringRationale?: ScoringRationale;
  sentenceCorrections: SentenceCorrection[];
  grammarIssues: GrammarNote[];
  vocabSuggestions: VocabNote[];
  improvementSuggestions: ImprovementSuggestion[];
  overallComment: string;
  examType?: ExamType;
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
  maxScore: number;
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
  /** 英式音标（IPA格式） */
  phoneticUK?: string;
  /** 美式音标（IPA格式） */
  phoneticUS?: string;
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
export type OptimizeStyle = WritingStyle | "creative" | "persuasive";
export type ExamType = "middle" | "high" | "cet4" | "cet6" | "ielts" | "general" | "literary";
export type OptimizeIntensity = "light" | "medium" | "deep";
export type OptimizeMode = "full" | "fragment";

// ========== 写作优化 ==========

export interface ImprovementItem {
  category: "grammar" | "vocabulary" | "logic" | "structure" | "content";
  original: string;
  optimized: string;
  reason: string;
}

export interface TransitionAnalysis {
  beforeCoherence: string;
  afterCoherence: string;
}

export interface OptimizeResult {
  optimizedText: string;
  improvements: ImprovementItem[];
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
  highlights: string;
  transitionAnalysis?: TransitionAnalysis;
  /** 逐句优化说明 */
  sentenceOptimizations?: SentenceOptimization[];
}

/** 逐句优化说明 */
export interface SentenceOptimization {
  original: string;
  optimized: string;
  changes: string;   // 做了哪些改动（中文）
  reason: string;     // 优化理由（中文）
}

export interface OptimizationRecord {
  id: string;
  originalText: string;
  optimizedText: string;
  style: string;
  examType: string;
  intensity: string;
  mode: string;
  improvements: ImprovementItem[];
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
  highlights: string;
  transitionAnalysis?: TransitionAnalysis;
  createdAt: string;
}

// ========== 语法病历本 ==========
export interface GrammarPattern {
  point: string;                    // 语法点名称，如 "虚拟语气"
  count: number;                    // 出现次数
  firstOccurred: string;            // 首次出现日期 ISO
  lastOccurred: string;             // 最近出现日期 ISO
  trend: "up" | "down" | "stable"; // up=恶化中, down=改善中, stable=平稳
  totalSpan: number;                // 跨度天数
  avgPerMonth: number;              // 月均出现次数
  levels: string[];                 // 难度等级（去重）
  sampleMistakes: CommonMistake[];  // 最多 3 条典型错误
}

export interface GrammarPatternAnalysis {
  patterns: GrammarPattern[];
  totalCorrections: number;
  totalIssues: number;
  uniquePoints: number;
  topPattern: string | null;
  topPatternCount: number;
  /** 是否还有更多结果（分页用） */
  hasMore?: boolean;
  /** 总语法点数量（分页用） */
  totalPatterns?: number;
}

export interface GrammarExercise {
  type: "fill-blank" | "error-correction";
  question: string;
  answer: string;
  explanation: string;
  point: string;
}

export interface GrammarExerciseResponse {
  exercises: GrammarExercise[];
  remaining: number;
}

// ========== 学习报告 ==========
export type ReportPeriodType = "week" | "month" | "custom";

export interface ReportPeriod {
  type: ReportPeriodType;
  startDate: string; // ISO
  endDate: string;   // ISO
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ScorePoint {
  date: string;
  score: number;
}

export interface DailyVocabCount {
  date: string;
  words: number;
  grammar: number;
}

export interface TranslationStats {
  total: number;
  byStyle: Record<string, number>;
  dailyCounts: DailyCount[];
}

export interface CorrectionStats {
  total: number;
  averageScore: number;
  maxScore: number;
  scoreTrend: ScorePoint[];
  byExamType: Record<string, number>;
}

export interface VocabGrowthStats {
  newWords: number;
  newGrammar: number;
  dailyAdded: DailyVocabCount[];
}

export interface ReportData {
  period: ReportPeriod;
  translationStats: TranslationStats;
  correctionStats: CorrectionStats;
  grammarPatterns: GrammarPattern[];
  totalGrammarIssues: number;
  vocabGrowth: VocabGrowthStats;
  generatedAt: string;
}

export interface ReportInsightsResponse {
  insights: string;
  remaining: number;
}

// ========== 好友系统 ==========

export interface UserSearchResult {
  id: string;
  name: string;
}

export interface FriendItem {
  id: string;
  friendId: string;
  name: string | null;
  addedAt: string;
}

export interface FriendRequestData {
  id: string;
  requesterId: string;
  requesterName: string | null;
  addresseeId: string;
  addresseeName: string | null;
  status: "pending" | "accepted" | "blocked";
  createdAt: string;
}

export type ShareContentType = "writing" | "correction" | "savedWord" | "savedGrammar";

export interface FriendStats {
  totalFriends: number;
  pendingRequests: number;
  unreadMessages: number;
}

// ========== 好友小窗聊天 ==========

export interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  contentType?: string;  // "writing" | "correction" | "savedWord" | "savedGrammar"
  contentId?: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationItem {
  friendId: string;
  friendName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// ========== 每日5词 ==========

export interface WordItem {
  word: string;
  chinese: string;
  /** 英式音标（IPA格式） */
  phoneticUK?: string;
  /** 美式音标（IPA格式） */
  phoneticUS?: string;
  partOfSpeech: string;
  definition: string;
  collocations: string[];
  usage: string;
  example: string;
  /** 词源讲解（中文），包含词根词缀分析 */
  etymology?: string;
}

export interface DailyVocabSession {
  id: string;
  date: string;
  topic: string;
  examType: string;
  difficulty: string;
  status: string;
  currentWordIndex: number;
  words: WordItem[];
  practices: { wordIndex: number; score: number; completed: boolean }[];
  scenarioMessages?: ScenarioTurnResult[];
  dictationState?: DictationState;
  usageConsumed: boolean;
}

export interface SentenceEvaluationResult {
  score: number;
  stars: number;
  semanticCorrect: boolean;
  grammarCorrect: boolean;
  naturalness: string;
  comment: string;
  suggestedImprovement: string;
  creativeBonus: boolean;
}

export interface ScenarioTurnResult {
  role: "ai" | "user";
  content: string;
  usedWords: string[];
  allUsedWords: string[];
  completed: boolean;
  review?: string;
}

export interface DictationState {
  /** 待拼写单词索引的队列，index 0 为当前单词。空数组 = 全部完成 */
  remainingIndices: number[];
  /** 已使用"显示首字母"提示的单词索引 (key 为字符串) */
  hintsUsed: Record<string, boolean>;
}

// ========== 共享单词本 ==========

export interface WordbookItem {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string | null;
  memberCount: number;
  wordCount: number;
  isOwner: boolean;
  createdAt: string;
}

export interface WordbookWordItem {
  id: string;
  word: string;
  chinese: string;
  /** 英式音标（IPA格式） */
  phoneticUK?: string | null;
  /** 美式音标（IPA格式） */
  phoneticUS?: string | null;
  level: string | null;
  usage: string | null;
  addedById: string;
  addedByName: string | null;
  createdAt: string;
}

export interface WordbookDetail extends WordbookItem {
  words: WordbookWordItem[];
  members: {
    userId: string;
    name: string | null;
    role: string;
    joinedAt: string;
  }[];
}
