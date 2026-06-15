import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <FileQuestion className="size-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">页面未找到</h1>
      <p className="max-w-md text-muted-foreground">
        您访问的页面不存在或已被移除。请检查网址是否正确。
      </p>
      <ButtonLink href="/">返回首页</ButtonLink>
    </div>
  );
}
