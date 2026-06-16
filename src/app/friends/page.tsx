"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, UserPlus, Search, Inbox } from "lucide-react";
import { FriendsList } from "@/components/FriendsList";
import { FriendRequests } from "@/components/FriendRequests";
import { SearchUsers } from "@/components/SearchUsers";
import { SharedInbox } from "@/components/SharedInbox";

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("list");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleRequestAccepted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">好友</h1>
        <p className="text-muted-foreground text-sm mt-1">
          管理好友，分享学习内容
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="list" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">好友列表</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">好友请求</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">搜索好友</span>
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-1">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">收件箱</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <FriendsList onSearchTab={() => setActiveTab("search")} />
        </TabsContent>

        <TabsContent value="requests">
          <FriendRequests key={refreshKey} onAccepted={handleRequestAccepted} />
        </TabsContent>

        <TabsContent value="search">
          <SearchUsers />
        </TabsContent>

        <TabsContent value="inbox">
          <SharedInbox />
        </TabsContent>
      </Tabs>
    </div>
  );
}
