import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error(
    "DEEPSEEK_API_KEY 未设置。请在 .env.local 中配置 DeepSeek API Key。"
  );
}

export const aiClient = new OpenAI({
  apiKey,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  timeout: 60000,       // 60s 超时，防止 AI 调用无限挂起
  maxRetries: 2,        // 网络瞬时故障自动重试
});
