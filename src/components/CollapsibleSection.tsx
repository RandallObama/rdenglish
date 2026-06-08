"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export function CollapsibleSection({
  summary,
  children,
  defaultOpen = false,
  className = "",
  action,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-lg bg-muted/10 ${className}`}>
      {/* 摘要行 — 点击切换展开/折叠 (用 div+role 避免与内部按钮嵌套) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-[inherit] cursor-pointer"
      >
        {/* 摘要内容 */}
        <div className="flex-1 min-w-0">{summary}</div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 操作按钮（如收藏），阻止冒泡避免触发展开 */}
          {action && (
            <span onClick={(e) => e.stopPropagation()}>{action}</span>
          )}
          {/* 展开/折叠箭头 */}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* 展开内容 — CSS Grid 动画 */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
