"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ChatContextValue {
  isOpen: boolean;
  initialFriendId: string | null;
  initialFriendName: string | null;
  openChat: (friendId?: string, friendName?: string | null) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialFriendId, setInitialFriendId] = useState<string | null>(null);
  const [initialFriendName, setInitialFriendName] = useState<string | null>(null);

  const openChat = useCallback((friendId?: string, friendName?: string | null) => {
    setInitialFriendId(friendId ?? null);
    setInitialFriendName(friendName ?? null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // 延迟清除，等动画结束
    setTimeout(() => {
      setInitialFriendId(null);
      setInitialFriendName(null);
    }, 200);
  }, []);

  return (
    <ChatContext.Provider value={{ isOpen, initialFriendId, initialFriendName, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
