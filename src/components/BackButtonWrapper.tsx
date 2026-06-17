"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "./BackButton";

/** 在首页隐藏返回按钮，其余页面正常显示 */
export function BackButtonWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <BackButton />;
}
