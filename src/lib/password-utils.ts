/**
 * 密码强度校验工具
 *
 * OWASP 推荐：用户自选密码至少 8 位，含大小写字母和数字
 */

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

export function validatePasswordStrength(password: string): PasswordValidation {
  if (!password || password.length < 8) {
    return { valid: false, error: "密码至少需要 8 位" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "密码需要包含至少一个大写字母" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "密码需要包含至少一个小写字母" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "密码需要包含至少一个数字" };
  }

  return { valid: true };
}
