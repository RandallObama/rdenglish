/**
 * Spug 推送平台短信服务
 *
 * 开发环境 (NODE_ENV !== "production")：验证码打印到控制台，不真实发送
 * 生产环境：通过 Spug HTTP API 发送验证码短信
 *
 * Spug 控制台: https://push.spug.cc
 * 接入方式：微信扫码 → 创建验证码模板 → 拿到模板 ID → 配置环境变量
 */

/** Spug API 响应结构 */
interface SpugResponse {
  code: number;
  message: string;
  data?: { id: string };
}

/**
 * 发送短信验证码
 * @param phone 手机号（11 位，不含 +86）
 * @param code  6 位验证码
 * @returns 是否发送成功
 */
export async function sendSmsCode(phone: string, code: string): Promise<boolean> {
  const templateId = process.env.SPUG_SMS_TEMPLATE_ID;

  if (!templateId) {
    console.error("Missing SPUG_SMS_TEMPLATE_ID");
    return false;
  }

  // 开发环境：打印到控制台，不消耗短信额度
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV SMS] To: ${phone}, Code: ${code}`);
    return true;
  }

  try {
    const url = `https://push.spug.cc/send/${templateId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "rdenglish",
        code,
        targets: phone,
      }),
    });

    if (!response.ok) {
      console.error("SMS send failed: HTTP", response.status);
      return false;
    }

    const result: SpugResponse = await response.json();

    if (result.code === 0) {
      return true;
    }

    console.error("SMS send failed:", result.message);
    return false;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}
