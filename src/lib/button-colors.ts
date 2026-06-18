import type { CSSProperties } from "react";

const PAIR_A: CSSProperties = { color: "#312F2C", backgroundColor: "#ABD1C6" };
const PAIR_B: CSSProperties = { color: "#ABD1C6", backgroundColor: "#312F2C" };
const PAIRS = [PAIR_A, PAIR_B];

/** 确定性哈希，SSR 安全，无随机数依赖 */
function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

/** 根据 seed 返回交替配色 style 对象，文字和背景互为 #312F2C / #ABD1C6 */
export function getBtnStyle(seed: string): CSSProperties {
  return PAIRS[Math.abs(hashStr(seed)) % 2];
}
