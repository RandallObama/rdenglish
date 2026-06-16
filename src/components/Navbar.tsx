"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, PenLine, Menu, X, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendBadge, setFriendBadge] = useState(0);

  useEffect(() => {
    if (!session) return;
    fetch("/api/friends/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.pendingRequests !== undefined) {
          setFriendBadge(data.pendingRequests + data.unreadShares);
        }
      })
      .catch(() => {});
  }, [session]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <PenLine className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">英语写作助手</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/write"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  写作
                </Link>
                <Link
                  href="/correct"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  批改
                </Link>
                <Link
                  href="/notebook"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  笔记本
                </Link>
                <Link
                  href="/grammar-patterns"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  语法病历
                </Link>
                <Link
                  href="/report"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  学习报告
                </Link>
                <Link
                  href="/friends"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  好友
                  {friendBadge > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[10px] leading-none">
                      {friendBadge}
                    </Badge>
                  )}
                </Link>
                <Link
                  href="/wordbooks"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  单词本
                </Link>
              </>
            ) : (
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                首页
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* 深色模式切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">切换主题</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" /> 浅色
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" /> 深色
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="mr-2 h-4 w-4" /> 系统
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 用户菜单 */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(session.user?.name || session.user?.email || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user?.name && (
                      <p className="font-medium text-sm">{session.user.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/write")}>
                  写作翻译
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/correct")}>
                  文章批改
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/notebook")}>
                  笔记本
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/grammar-patterns")}>
                  语法病历
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/report")}>
                  学习报告
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/friends")}>
                  <Users className="mr-2 h-4 w-4" />
                  好友
                  {friendBadge > 0 && (
                    <Badge variant="destructive" className="ml-auto h-4 px-1 text-[10px] leading-none">
                      {friendBadge}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/wordbooks")}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  单词本
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  仪表盘
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/history")}>
                  翻译记录
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/history/corrections")}>
                  批改记录
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                登录
              </Link>
              <Link href="/register" className={buttonVariants()}>
                免费注册
              </Link>
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div
        className={`md:hidden border-t bg-background overflow-hidden transition-all duration-200 ease-in-out ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-3 space-y-2">
          {session ? (
            <>
              <Link href="/write" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                写作
              </Link>
              <Link href="/correct" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                批改
              </Link>
              <Link href="/notebook" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                笔记本
              </Link>
              <Link href="/grammar-patterns" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                语法病历
              </Link>
              <Link href="/report" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                学习报告
              </Link>
              <Link href="/friends" className="block py-2.5 text-sm flex items-center gap-1" onClick={() => setMenuOpen(false)}>
                好友
                {friendBadge > 0 && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px] leading-none">
                    {friendBadge}
                  </Badge>
                )}
              </Link>
              <Link href="/wordbooks" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                单词本
              </Link>
              <Link href="/dashboard" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                仪表盘
              </Link>
              <Link href="/history" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                翻译记录
              </Link>
              <Link href="/history/corrections" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                批改记录
              </Link>
              <button
                className="block py-2.5 text-sm text-red-600 dark:text-red-400"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                登录
              </Link>
              <Link href="/register" className="block py-2.5 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                免费注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
