"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";

export default function RegisterPage() {
  const router = useRouter();

  // ── 共享状态 ──
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── 邮箱注册状态 ──
  const [email, setEmail] = useState("");

  // ── 手机注册状态 ──
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 倒计时 ──
  const startCountdown = useCallback(() => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── 发送验证码 ──
  const handleSendCode = async () => {
    setError("");

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的手机号");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        return;
      }

      // 开发模式：显示验证码（短信未真实发送）
      if (data.devCode) {
        toast.success(`验证码已发送（开发模式）`, {
          description: `验证码: ${data.devCode}`,
          duration: 15000,
        });
        // 自动填入验证码
        setCode(data.devCode);
      } else {
        toast.success("验证码已发送");
      }
      startCountdown();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSending(false);
    }
  };

  // ── 邮箱注册 ──
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址，例如 name@example.com");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      // 自动登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/write");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // ── 手机号注册 ──
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的手机号");
      setLoading(false);
      return;
    }

    if (!code || code.length !== 6) {
      setError("请输入6位验证码");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      // 自动登录（传入手机号作为 identifier）
      const result = await signIn("credentials", {
        email: phone,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/write");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            创建账号，开始提升你的英语写作能力
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="email" className="flex-1">
                邮箱注册
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex-1">
                手机注册
              </TabsTrigger>
            </TabsList>

            {/* ── 邮箱注册 Tab ── */}
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name-email">
                    昵称 <span className="text-muted-foreground">（可选）</span>
                  </label>
                  <Input
                    id="name-email"
                    type="text"
                    placeholder="你的昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    邮箱
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password-email">
                    密码
                  </label>
                  <Input
                    id="password-email"
                    type="password"
                    placeholder="至少 6 位"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading} style={getBtnStyle("register:email-submit")}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  注册
                </Button>
              </form>
            </TabsContent>

            {/* ── 手机注册 Tab ── */}
            <TabsContent value="phone">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name-phone">
                    昵称 <span className="text-muted-foreground">（可选）</span>
                  </label>
                  <Input
                    id="name-phone"
                    type="text"
                    placeholder="你的昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">
                    手机号
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    required
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="code">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="6位验证码"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      required
                      maxLength={6}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={sending || countdown > 0}
                      className="shrink-0"
                      style={getBtnStyle("register:send-code")}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}秒后重发`
                      ) : (
                        "发送验证码"
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password-phone">
                    密码
                  </label>
                  <Input
                    id="password-phone"
                    type="password"
                    placeholder="至少 6 位"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading} style={getBtnStyle("register:phone-submit")}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-sm text-center text-muted-foreground mt-6">
            已有账号？{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              立即登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
