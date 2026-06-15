/**
 * 阿里云短信服务客户端
 *
 * 开发环境 (NODE_ENV !== "production")：验证码打印到控制台，不真实发送
 * 生产环境：通过阿里云 SMS SDK 发送验证码短信
 */

import Dysmsapi20170525, * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";

/** 阿里云 SMS 客户端单例 */
let client: Dysmsapi20170525 | null = null;

function getClient(): Dysmsapi20170525 {
  if (client) return client;

  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error("Missing ALIBABA_ACCESS_KEY_ID or ALIBABA_ACCESS_KEY_SECRET");
  }

  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret,
  });
  config.endpoint = "dysmsapi.aliyuncs.com";

  client = new Dysmsapi20170525(config);
  return client;
}

/**
 * 发送短信验证码
 * @param phone 手机号（11 位，不含 +86）
 * @param code  6 位验证码
 * @returns 是否发送成功
 */
export async function sendSmsCode(phone: string, code: string): Promise<boolean> {
  // 开发环境：打印到控制台
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV SMS] To: ${phone}, Code: ${code}`);
    return true;
  }

  const signName = process.env.ALIBABA_SMS_SIGN_NAME;
  const templateCode = process.env.ALIBABA_SMS_TEMPLATE_CODE;

  if (!signName || !templateCode) {
    console.error("Missing ALIBABA_SMS_SIGN_NAME or ALIBABA_SMS_TEMPLATE_CODE");
    return false;
  }

  try {
    const smsClient = getClient();
    const request = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code }),
    });

    const response = await smsClient.sendSms(request);

    if (response.body?.code === "OK") {
      return true;
    }

    console.error("SMS send failed:", response.body?.message);
    return false;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}
