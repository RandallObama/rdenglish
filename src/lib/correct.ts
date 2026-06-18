import { aiClient } from "@/lib/ai-client";
import type { CorrectionResult, ExamType } from "@/types";

// ═══════════════════════════════════════════════════════════
// 评分档位描述 — 每个考试类型的每个维度都定义了 4-5 个档位
// 让 AI 有清晰的锚点，避免全部集中在中间分数段
// ═══════════════════════════════════════════════════════════

interface ExamStandard {
  name: string;
  maxScore: number;
  rubric: string;        // 详细的评分档位表
  criteria: string;      // 简短概述（用于非评分部分的上下文）
  maxSubScores: { content: number; structure: number; grammar: number; vocabulary: number };
}

const examStandards: Record<ExamType, ExamStandard> = {
  // ── 高考（最常用，档位最细） ──
  high: {
    name: "高考",
    maxScore: 25,
    maxSubScores: { content: 7, structure: 6, grammar: 6, vocabulary: 6 },
    criteria: "高考英语作文评分标准（满分25分）",
    rubric: `## 高考英语作文评分档位表（满分25分）

### 内容 Content（满分7分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 7 | 覆盖全部要点；观点明确且有深度；细节丰富、论证充分、有独立见解 |
| 第四档 | 5-6 | 覆盖主要要点；观点清晰但深度一般；有基本论证但细节不够丰富 |
| 第三档 | 3-4 | 遗漏1-2个要点；观点基本清楚但较模糊；论证单薄、缺乏细节支撑 |
| 第二档 | 1-2 | 遗漏多个要点；观点混乱；几乎没有有效论证 |
| 第一档 | 0 | 完全偏题或内容空洞无物 |

### 结构 Structure（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 段落划分合理（3段以上）；逻辑层次清晰；衔接词运用自如且多样（however, therefore, furthermore, in contrast 等） |
| 第四档 | 4-5 | 有基本段落结构；逻辑基本连贯；使用了一些衔接词但较为单调（反复用 and/but/so） |
| 第三档 | 2-3 | 段落划分不清；逻辑跳跃；衔接词使用极少或使用不当 |
| 第二档 | 1 | 全文一段到底；逻辑混乱；基本没有衔接手段 |
| 第一档 | 0 | 完全无结构可言 |

### 语法 Grammar（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 正确使用复合句、非谓语动词、定语从句、名词性从句等高级结构；几乎无语法错误 |
| 第四档 | 4-5 | 基础语法（时态、语态、主谓一致）正确；尝试使用复杂结构但偶有1-2处小错 |
| 第三档 | 2-3 | 以简单句为主；偶有复杂句但错误较多（3-5处）；基础语法有小错但不严重影响理解 |
| 第二档 | 1 | 大量基础语法错误（5处以上）；句式单一；开始影响理解 |
| 第一档 | 0 | 语法错误严重，严重影响阅读理解 |

### 词汇 Vocabulary（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 词汇丰富多样；恰当使用高级词汇和地道搭配；有意识的同义替换避免重复；拼写完全正确 |
| 第四档 | 4-5 | 词汇量尚可；使用了少量高级词汇；有1-2处搭配不够地道；偶有拼写错误 |
| 第三档 | 2-3 | 词汇基础、偏口语化；多次重复使用同一词汇（如反复用 good/important）；搭配较为中式 |
| 第二档 | 1 | 词汇量贫乏；大量中式英语；拼写错误多 |
| 第一档 | 0 | 词汇错误严重影响理解 |

> ⚠️ 评分纪律：
> 1. **使用全分数区间**：不要集中在 3-5 分区间。真正优秀的作文应该拿到 6-7 分，很差的应该拿到 0-2 分。
> 2. **拉开差距**：如果两篇作文水平明显不同，总分差距应在 5 分以上。
> 3. **内容为纲**：内容得分应带动其他维度——内容空洞的文章不应在语法和词汇上拿高分。`,
  },

  // ── 中考 ──
  middle: {
    name: "中考",
    maxScore: 25,
    maxSubScores: { content: 7, structure: 6, grammar: 6, vocabulary: 6 },
    criteria: "中考英语作文评分标准（满分25分）",
    rubric: `## 中考英语作文评分档位表（满分25分）

### 内容 Content（满分7分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 7 | 要点齐全无遗漏；内容充实；能适当发挥 |
| 第四档 | 5-6 | 要点基本齐全；内容较充实但发挥较少 |
| 第三档 | 3-4 | 遗漏1个要点；内容单薄 |
| 第二档 | 1-2 | 遗漏多个要点；内容贫乏 |
| 第一档 | 0 | 完全偏题或空白 |

### 结构 Structure（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 段落清晰；有开头-正文-结尾意识；使用基础衔接词（first, second, finally）|
| 第四档 | 4-5 | 有分段但不够合理；衔接词使用较少 |
| 第三档 | 2-3 | 分段混乱；逻辑不连贯 |
| 第二档 | 1 | 无段落意识 |
| 第一档 | 0 | 完全无结构 |

### 语法 Grammar（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 基础语法扎实（时态/单复数/主谓一致正确）；尝试宾语从句等结构；几乎无错 |
| 第四档 | 4-5 | 基础语法基本正确；有1-2处小错（如第三人称单数忘加s）|
| 第三档 | 2-3 | 基础语法有3-5处错误但不严重影响理解 |
| 第二档 | 1 | 基础语法错误多，影响理解 |
| 第一档 | 0 | 几乎每句都有语法错误 |

### 词汇 Vocabulary（满分6分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 6 | 词汇恰当准确；有一定词汇量；拼写正确 |
| 第四档 | 4-5 | 词汇基本恰当；偶有拼写错误或用词不当 |
| 第三档 | 2-3 | 词汇偏基础；有中式英语痕迹 |
| 第二档 | 1 | 词汇贫乏；大量拼写错误 |
| 第一档 | 0 | 词汇错误严重影响理解 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 5 分。`,
  },

  // ── 四级 ──
  cet4: {
    name: "四级",
    maxScore: 15,
    maxSubScores: { content: 4, structure: 4, grammar: 4, vocabulary: 3 },
    criteria: "四级作文评分标准（满分15分）",
    rubric: `## 四级作文评分档位表（满分15分）

### 内容 Content（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 完全切题；观点明确；论证充分且有细节支撑 |
| 第三档 | 2-3 | 基本切题；观点较明确；论证一般 |
| 第二档 | 1 | 部分偏题；观点模糊 |
| 第一档 | 0 | 完全偏题 |

### 结构 Structure（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 引言-正文-结论完整；过渡自然；衔接手段多样 |
| 第三档 | 2-3 | 结构基本完整但过渡生硬；衔接词单调 |
| 第二档 | 1 | 结构残缺；逻辑混乱 |
| 第一档 | 0 | 无结构 |

### 语法 Grammar（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 句式多样；复杂句正确；几乎无语法错误 |
| 第三档 | 2-3 | 以简单句为主；尝试复杂句但有错误；基础语法基本正确 |
| 第二档 | 1 | 语法错误较多 |
| 第一档 | 0 | 语法错误严重影响理解 |

### 词汇 Vocabulary（满分3分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 3 | 词汇丰富；有学术词汇和同义替换意识；搭配地道 |
| 第三档 | 1.5-2 | 词汇够用但偏基础；偶有搭配不当 |
| 第二档 | 0.5-1 | 词汇贫乏或中式英语明显 |
| 第一档 | 0 | 词汇错误严重 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 3 分。`,
  },

  // ── 六级 ──
  cet6: {
    name: "六级",
    maxScore: 15,
    maxSubScores: { content: 4, structure: 4, grammar: 4, vocabulary: 3 },
    criteria: "六级作文评分标准（满分15分）",
    rubric: `## 六级作文评分档位表（满分15分）

### 内容 Content（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 观点深刻；论证有力且有独立见解；论据具体充实 |
| 第三档 | 2-3 | 观点明确但深度不够；论证较表面 |
| 第二档 | 1 | 观点浅显；论证牵强 |
| 第一档 | 0 | 无实质内容 |

### 结构 Structure（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 逻辑严密；层次丰富；衔接手段多样且自然 |
| 第三档 | 2-3 | 结构完整但层次简单；过渡基本顺畅 |
| 第二档 | 1 | 结构松散；衔接生硬 |
| 第一档 | 0 | 无结构 |

### 语法 Grammar（满分4分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 4 | 长难句驾驭能力强；语法错误极少（≤1处）；句式变化丰富 |
| 第三档 | 2-3 | 有复杂句意识但偶有错误（2-3处）；基础语法扎实 |
| 第二档 | 1 | 复杂句错误多；基础语法不够扎实 |
| 第一档 | 0 | 语法错误严重影响理解 |

### 词汇 Vocabulary（满分3分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 3 | 学术词汇丰富；搭配地道精准；同义替换意识强 |
| 第三档 | 1.5-2 | 词汇量充分但缺乏亮点；搭配基本正确 |
| 第二档 | 0.5-1 | 词汇偏基础/口语化；有中式英语 |
| 第一档 | 0 | 词汇错误严重 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 3 分。`,
  },

  // ── 雅思/托福 ──
  ielts: {
    name: "雅思/托福",
    maxScore: 9,
    maxSubScores: { content: 2.5, structure: 2.5, grammar: 2, vocabulary: 2 },
    criteria: "雅思写作评分标准（满分9分）",
    rubric: `## 雅思写作评分档位表（满分9分）

### 任务完成度 Task Achievement（满分2.5分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 2-2.5 | 完全回应题目；立场清晰；论点充分展开且有数据/例证支撑 |
| 第三档 | 1-1.5 | 回应了主要问题但展开不够；部分论点缺乏支撑 |
| 第二档 | 0.5 | 部分偏题；论点不完整 |
| 第一档 | 0 | 完全未回应题目 |

### 连贯与衔接 Coherence & Cohesion（满分2.5分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 2-2.5 | 段落组织清晰；衔接手段运用自如；指代关系明确 |
| 第三档 | 1-1.5 | 有段落结构但不均衡；衔接手段有但不够灵活 |
| 第二档 | 0.5 | 段落逻辑关系不清；衔接生硬 |
| 第一档 | 0 | 完全无逻辑组织 |

### 语法范围与准确性 Grammatical Range（满分2分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 1.5-2 | 灵活使用多种句式；复杂结构准确；极少错误 |
| 第三档 | 0.5-1 | 句式有一定变化；复杂句偶有错误 |
| 第二档 | 0-0.5 | 句式单一；语法错误频繁 |

### 词汇资源 Lexical Resource（满分2分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第四档 | 1.5-2 | 词汇广泛精准；熟练使用搭配和习语；拼写正确 |
| 第三档 | 0.5-1 | 词汇够用但不突出；偶有用词不当 |
| 第二档 | 0-0.5 | 词汇有限；频繁用词不当或拼写错误 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 2 分。`,
  },

  // ── 通用 ──
  general: {
    name: "通用",
    maxScore: 100,
    maxSubScores: { content: 30, structure: 25, grammar: 25, vocabulary: 20 },
    criteria: "通用英语作文评分标准（满分100分）",
    rubric: `## 通用评分档位表（满分100分）

### 内容 Content（满分30分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 25-30 | 主题突出；观点深刻；论证充分有力；细节丰富生动 |
| 第四档 | 18-24 | 主题明确；观点清晰；有一定论证但细节不够丰富 |
| 第三档 | 10-17 | 主题基本清楚但观点较模糊；论证单薄 |
| 第二档 | 1-9 | 主题不清；观点混乱；几乎无论证 |
| 第一档 | 0 | 完全偏题或无内容 |

### 结构 Structure（满分25分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 21-25 | 篇章结构严谨；段落逻辑清晰；衔接手段丰富自然 |
| 第四档 | 15-20 | 结构完整；段落划分合理；衔接基本流畅 |
| 第三档 | 8-14 | 结构基本完整但段落之间过渡生硬 |
| 第二档 | 1-7 | 结构残缺；逻辑跳跃 |
| 第一档 | 0 | 完全无结构 |

### 语法 Grammar（满分25分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 21-25 | 句式多样且复杂；语法几乎无错；能灵活运用各种语法结构 |
| 第四档 | 15-20 | 基础语法正确；有一定句式变化；偶有1-3处小错 |
| 第三档 | 8-14 | 以简单句为主；复杂句错误较多；基础语法有3-5处错误 |
| 第二档 | 1-7 | 大量语法错误；影响阅读理解 |
| 第一档 | 0 | 语法错误严重，几乎无法阅读 |

### 词汇 Vocabulary（满分20分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 17-20 | 词汇丰富精准；搭配地道；有修辞意识；无拼写错误 |
| 第四档 | 12-16 | 词汇量较好；使用了一些高级词汇；偶有搭配不当 |
| 第三档 | 6-11 | 词汇基础；重复率高；有中式英语痕迹 |
| 第二档 | 1-5 | 词汇贫乏；大量中式英语或拼写错误 |
| 第一档 | 0 | 词汇错误严重 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 15 分。`,
  },

  // ── 文学批评 ──
  literary: {
    name: "文学批评",
    maxScore: 100,
    // 映射关系（前端显示用）：
    //   content=情节构建(30)  structure=语言风格(30)  grammar=人物场景(20)  vocabulary=主题统一(20)
    maxSubScores: { content: 30, structure: 30, grammar: 20, vocabulary: 20 },
    criteria: "文学批评标准（满分100分），从文学创作角度评价英语写作的文学性",
    rubric: `## 文学批评评分档位表（满分100分）

### 情节构建与叙事结构 Plot & Narrative Structure（满分30分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 25-30 | 叙事弧线完整有力（开端-发展-高潮-结局）；冲突有张力且自然推进；节奏张弛有度；伏笔呼应巧妙；因果关系清晰 |
| 第四档 | 18-24 | 叙事结构完整；有基本冲突和推进；节奏总体合理但偶有拖沓 |
| 第三档 | 10-17 | 叙事结构基本完整但平铺直叙；冲突张力不足；节奏把控一般 |
| 第二档 | 1-9 | 叙事结构残缺或混乱；缺乏冲突驱动 |
| 第一档 | 0 | 无叙事结构 |

### 文学语言与风格 Literary Language & Style（满分30分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 25-30 | 修辞手法丰富且运用得当（隐喻/象征/反讽/排比等）；意象鲜明有感染力；措辞精准有文学质感；句式变化有意图；叙事声音一致有辨识度；遵循"Show, don't tell" |
| 第四档 | 18-24 | 使用了一些修辞手法但不够丰富；语言有一定表现力；句式有变化但意图不够清晰 |
| 第三档 | 10-17 | 语言平实偏叙述性；修辞手法极少或使用生硬；缺乏文学感染力 |
| 第二档 | 1-9 | 语言枯燥；大量陈词滥调；缺乏文学性 |
| 第一档 | 0 | 无文学性可言 |

### 人物塑造与场景 Character & Setting（满分20分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 17-20 | 人物立体（通过行动/对话/内心细节展现）；有性格弧线；场景沉浸感强；感官细节丰富 |
| 第四档 | 12-16 | 人物有基本塑造但不够立体；场景描写有一定画面感 |
| 第三档 | 6-11 | 人物扁平、以直接告知为主；场景描写缺乏细节 |
| 第二档 | 1-5 | 人物符号化；无场景意识 |
| 第一档 | 0 | 无人物塑造或场景描写 |

### 主题深度与统一性 Theme & Organic Unity（满分20分）
| 档位 | 分数 | 标准 |
|------|------|------|
| 第五档 | 17-20 | 主题深刻独创；各部分有机统一无冗余；结尾有情感共鸣或思想启发性；作品有艺术完整性 |
| 第四档 | 12-16 | 主题明确但深度一般；各部分基本围绕主题但有少量冗余 |
| 第三档 | 6-11 | 主题浅显；部分内容与主题关联不紧密 |
| 第二档 | 1-5 | 主题模糊；内容散乱 |
| 第一档 | 0 | 无主题 |

> ⚠️ 评分纪律：使用全分数区间；水平不同的作文总分差距应 ≥ 15 分。`,
  },
};

// ══════════════════════════════════════
// 辅助函数
// ══════════════════════════════════════

function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/```json?\s*/gi, "").replace(/```\s*/g, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

/** 构建系统 prompt — 评分档位表占主导，确保 AI 严格按标准打分 */
function makeCorrectSystemPrompt(standard: ExamStandard, examType: ExamType): string {
  const isLiterary = examType === "literary";

  // 文学批评使用独立的维度映射说明
  const scoringSteps = isLiterary
    ? `## 第一步：逐维度评分（最重要！请反复对照档位表）

文学批评的 4 个维度与 JSON 输出字段的对应关系如下（必须严格按此映射输出）：

| 文学批评维度 | JSON 字段名 | 满分 |
|---|---|---|
| 情节构建与叙事结构 Plot & Narrative | **content** | ${standard.maxSubScores.content} |
| 文学语言与风格 Literary Language & Style | **structure** | ${standard.maxSubScores.structure} |
| 人物塑造与场景 Character & Setting | **grammar** | ${standard.maxSubScores.grammar} |
| 主题深度与统一性 Theme & Organic Unity | **vocabulary** | ${standard.maxSubScores.vocabulary} |

对每个维度，对照档位表确定档位和分数，然后用一句话解释打分理由：

1. **情节构建与叙事结构**（输出到 content 字段）：叙事弧线是否完整？冲突是否有张力？节奏张弛如何？伏笔呼应如何？
2. **文学语言与风格**（输出到 structure 字段）：修辞手法是否丰富得当？意象是否鲜明？措辞是否有文学质感？句式变化是否有意图？
3. **人物塑造与场景**（输出到 grammar 字段）：人物是否立体？是否有性格弧线？场景是否沉浸感强？感官细节是否丰富？
4. **主题深度与统一性**（输出到 vocabulary 字段）：主题是否深刻独创？各部分是否有机统一？结尾是否有共鸣或启发性？

⚠️ 再次强调：**使用全分数区间**。如果文章很好——给高分（靠近满分），很差——给低分（靠近0分）。不要集中在中档。`
    : `## 第一步：逐维度评分（最重要！请反复对照档位表）

对每个维度，对照档位表确定档位和分数，然后用一句话解释打分理由：

1. **内容**：这篇文章覆盖了几个要点？观点深度如何？论证是否充分？
2. **结构**：段落划分是否合理？衔接词使用如何？逻辑是否连贯？
3. **语法**：最大亮点是什么（如有）？最突出的问题是什么？错误数量级别？
4. **词汇**：词汇量处于哪个档位？有没有高级词汇/地道搭配？中式英语程度？

⚠️ 再次强调：**使用全分数区间**。如果文章很好——给高分（靠近满分），很差——给低分（靠近0分）。不要集中在中档。`;

  return `你是资深英语阅卷老师，15年${standard.name}阅卷经验。请严格按以下档位表批改作文。

# 评分档位表（必须严格对照）

${standard.rubric}

---

# 批改流程

${scoringSteps}

## 第二步：逐句批注（sentenceCorrections，3-8条）

对值得点评的句子给出：
- original: 原句
- revised: 改进后（如无需修改则写原句）
- comment: 点评（中文，指出优点或问题）

## 第三步：语法问题（grammarIssues，2-5个）

找出典型语法问题：
- point: 语法点名称（中文）
- level: 难度级别（基础/进阶/高级）
- function: 该语法点的正确功能
- structure: 正确结构公式
- explanation: 详细讲解
- examples: 正确例句（1-3个）
- commonMistakes: 常见类似错误 [{error, correction, explanation}]
- examTip: ${standard.name}考试中此语法点的注意事项

## 第四步：词汇建议（vocabSuggestions，3-5个）

挑出可以升级的词汇：
- word: 建议的词汇/短语
- chinese: 中文释义
- collocations: 常用搭配
- synonyms: 近义词对比
- level: 词汇等级
- usage: 用法说明
- examples: 例句
- commonErrors: 常见误用 [{error, correction, explanation}]
- examFocus: 考试关注点

## 第五步：整体优化建议（improvementSuggestions，3-4条）

从结构/论证/风格等宏观角度给出具体可执行的建议，避免空话：
- suggestion: 具体建议（中文）
- reason: 原因（中文）

## 第六步：总评（overallComment）

中文总结（80-150字）：最突出的优点 + 最需要改进的地方 + 一句话鼓励。

---

# 输出格式（JSON，不要 markdown 代码块）

{
  "totalScore": 分数,
  "maxScore": ${standard.maxScore},
  "scores": {
    "content": ${standard.maxSubScores.content}以内的分数,
    "structure": ${standard.maxSubScores.structure}以内的分数,
    "grammar": ${standard.maxSubScores.grammar}以内的分数,
    "vocabulary": ${standard.maxSubScores.vocabulary}以内的分数
  },
  "scoringRationale": {
    "content": "一句话解释${isLiterary ? "情节构建与叙事结构" : "内容"}得分理由",
    "structure": "一句话解释${isLiterary ? "文学语言与风格" : "结构"}得分理由",
    "grammar": "一句话解释${isLiterary ? "人物塑造与场景" : "语法"}得分理由",
    "vocabulary": "一句话解释${isLiterary ? "主题深度与统一性" : "词汇"}得分理由"
  },
  "sentenceCorrections": [...],
  "grammarIssues": [...],
  "vocabSuggestions": [...],
  "improvementSuggestions": [...],
  "overallComment": "总评文本"
}`;
}

// ══════════════════════════════════════
// 批改 API
// ══════════════════════════════════════

export async function correctEssay(
  essayText: string,
  examType: ExamType = "general"
): Promise<CorrectionResult> {
  const standard = examStandards[examType];
  const systemPrompt = makeCorrectSystemPrompt(standard, examType);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: essayText },
    ],
    temperature: 0.1,
    max_tokens: 8192,
  });

  const raw = response.choices[0]?.message?.content || "";
  const jsonStr = extractJson(raw);

  try {
    const parsed = JSON.parse(jsonStr) as CorrectionResult;
    parsed.examType = examType;
    return parsed;
  } catch (e) {
    console.error("correctEssay JSON parse error:", e, "\nRaw content:", raw);
    return {
      totalScore: 0,
      maxScore: standard.maxScore,
      scores: { content: 0, structure: 0, grammar: 0, vocabulary: 0 },
      sentenceCorrections: [],
      grammarIssues: [],
      vocabSuggestions: [],
      improvementSuggestions: [],
      overallComment: "AI 返回格式异常，请稍后重试。如持续出现，请尝试缩短作文或更换标准。",
      examType,
    };
  }
}

// ══════════════════════════════════════
// 流式批改
// ══════════════════════════════════════

export async function* streamCorrectEssay(
  essayText: string,
  examType: ExamType = "general"
): AsyncGenerator<string, CorrectionResult, unknown> {
  const standard = examStandards[examType];
  const systemPrompt = makeCorrectSystemPrompt(standard, examType);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: essayText },
    ],
    temperature: 0.1,
    max_tokens: 8192,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of response) {
    const delta = (chunk as unknown as Record<string, unknown>).choices as any[] | undefined;
    const content = delta?.[0]?.delta?.content as string | undefined;
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  const jsonStr = extractJson(fullContent);

  try {
    const parsed = JSON.parse(jsonStr) as CorrectionResult;
    parsed.examType = examType;
    return parsed;
  } catch (e) {
    console.error("streamCorrectEssay JSON parse error:", e, "\nRaw content:", fullContent);
    return {
      totalScore: 0,
      maxScore: standard.maxScore,
      scores: { content: 0, structure: 0, grammar: 0, vocabulary: 0 },
      sentenceCorrections: [],
      grammarIssues: [],
      vocabSuggestions: [],
      improvementSuggestions: [],
      overallComment: "AI 返回格式异常，请稍后重试。如持续出现，请尝试缩短作文或更换标准。",
      examType,
    };
  }
}
