"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ChatProvider } from "@/components/ChatContext";
import dynamic from "next/dynamic";

const ChatPanel = dynamic(() => import("@/components/ChatPanel").then((m) => m.ChatPanel), {
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
