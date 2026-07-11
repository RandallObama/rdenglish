"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ChatProvider } from "@/components/ChatContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const ChatPanel = dynamic(() => import("@/components/ChatPanel").then((m) => m.ChatPanel), {
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 秒内数据视为新鲜，不重新请求
            gcTime: 5 * 60 * 1000, // 5 分钟垃圾回收
            refetchOnWindowFocus: false, // 切回页面不自动刷新
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ChatProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <ChatPanel />
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </ChatProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
