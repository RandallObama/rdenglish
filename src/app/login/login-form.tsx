"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getBtnStyle } from "@/lib/button-colors";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetLink, setShowResetLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResetLink(false);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: identifier,
        password,
        redirect: false,
      });

      setLoading(false);

      // 检查是否触发了密码重置提示
      const resultStr = JSON.stringify(result);
      if (resultStr.includes("RESET_NEEDED")) {
        setError("密码错误，已连续失败 3 次。如需重置密码，请点击下方链接");
        setShowResetLink(true);
        return;
      }

      if (result?.error) {
        setError(`登录失败：${result.error}`);
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(`登录异常：${resultStr}`);
      }
    } catch (err: any) {
      setLoading(false);
      setError(`网络或系统错误：${err?.message || String(err)}`);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">登录</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          欢迎回来，继续你的英语写作之旅
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              邮箱 / 手机号
            </label>
            <Input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="邮箱或手机号"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              密码
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {showResetLink && (
            <p className="text-sm text-center">
              <Link
                href="/reset-password"
                className="text-primary hover:underline font-medium"
              >
                忘记密码？点击重置
              </Link>
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading} style={getBtnStyle("login:submit")}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            登录
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            还没有账号？{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              立即注册
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
