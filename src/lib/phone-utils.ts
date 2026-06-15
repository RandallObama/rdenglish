/**
 * 手机号工具函数
 */

/** 去除所有非数字字符，返回纯数字手机号 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** 校验中国大陆手机号：11 位，1[3-9] 开头 */
export function isValidChinesePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/** 手机号脱敏显示：138****1234 */
export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(7);
}

/** 简单邮箱格式校验 */
export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input);
}
