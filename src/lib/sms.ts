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
  msg: string;
  data?: { id: string };
}

/**
 * 发送短信验证码
 * @param phone 手机号（11 位，不含 +86）
 * @param code  6 位验证码
 * @returns 是否发送成功
 */
export async function sendSmsCode(phone: string, code: string): Promise<{ success: boolean; detail?: string }> {
  const templateId = process.env.SPUG_SMS_TEMPLATE_ID;

  if (!templateId) {
    console.error("[SMS] ❌ SPUG_SMS_TEMPLATE_ID 环境变量未设置");
    return { success: false, detail: "SPUG_SMS_TEMPLATE_ID 未配置" };
  }

  // 开发环境：打印到控制台，不消耗短信额度
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SMS] 🔧 DEV 模式 - 短信未真实发送`);
    console.log(`[SMS] 📱 目标手机: ${phone}`);
    console.log(`[SMS] 🔢 验证码: ${code}`);
    return { success: true };
  }

  console.log(`[SMS] 🚀 开始发送短信 (生产模式)`);
  console.log(`[SMS] 📱 手机号: ${phone}`);
  console.log(`[SMS] 📋 模板 ID: ${templateId}`);

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

    console.log(`[SMS] 🌐 Spug HTTP 状态码: ${response.status}`);

    if (!response.ok) {
      const body = await response.text();
      console.error(`[SMS] ❌ Spug HTTP 错误 ${response.status}: ${body}`);
      return { success: false, detail: `HTTP ${response.status}: ${body}` };
    }

    const result: SpugResponse = await response.json();
    console.log(`[SMS] 📩 Spug 响应: code=${result.code}, msg="${result.msg}"`);

    // Spug API 成功时返回 code=0 或 code=200（不同版本可能不同）
    if (result.code === 0 || result.code === 200) {
      console.log(`[SMS] ✅ 短信发送成功`);
      return { success: true };
    }

    console.error(`[SMS] ❌ Spug 返回失败: code=${result.code}, msg="${result.msg}"`);
    return { success: false, detail: `${result.msg}` };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SMS] ❌ 网络/异常错误: ${errMsg}`);
    return { success: false, detail: `网络异常: ${errMsg}` };
  }
}
