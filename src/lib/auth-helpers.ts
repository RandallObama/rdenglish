/**
 * 认证辅助工具
 *
 * 提供跨路由复用的管理员检查等函数
 */

/** 检查用户是否为管理员（通过环境变量 ADMIN_USER_IDS 配置） */
export async function checkAdmin(userId: string): Promise<boolean> {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
