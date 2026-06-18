"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";

export default function ResetPasswordPage() {
  const router = useRouter();

  // ── Step 1: 输入邮箱/手机号 + 发送验证码 ──
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [sending, setSending] = useState(false);

  // ── Step 2: 输入验证码 + 新密码 ──
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  // ── 错误 ──
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Step 1: 发送验证码 ──
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("请输入邮箱或手机号");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/reset-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败，请稍后重试");
        return;
      }

      // 开发模式：显示验证码
      if (data.devCode) {
        toast.success("验证码（开发模式）", {
          description: `验证码: ${data.devCode}`,
          duration: 15000,
        });
        setCode(data.devCode);
      }

      setSuccessMsg(data.message || "如果该账号绑定了手机号，验证码已发送");
      setStep(2);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: 确认重置 ──
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code || code.length !== 6) {
      setError("请输入6位验证码");
      return;
    }

    if (newPassword.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch("/api/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "重置失败，请稍后重试");
        return;
      }

      toast.success("密码重置成功，请使用新密码登录");
      router.push("/login");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">重置密码</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1
              ? "输入你的邮箱或手机号以验证身份"
              : "输入验证码并设置新密码"}
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            /* ═══ Step 1: 输入标识 ═══ */
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="identifier">
                  邮箱 / 手机号
                </label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="请输入邮箱或手机号"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={sending}
                style={getBtnStyle("reset-pwd:send-code")}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                发送验证码
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  返回登录
                </Link>
              </p>
            </form>
          ) : (
            /* ═══ Step 2: 验证码 + 新密码 ═══ */
            <form onSubmit={handleConfirm} className="space-y-4">
              {/* 成功消息 */}
              {successMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {successMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="code">
                  验证码
                </label>
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
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="newPassword">
                  新密码
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="至少 6 位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={confirming}
                style={getBtnStyle("reset-pwd:confirm")}
              >
                {confirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                确认重置密码
              </Button>

              <button
                type="button"
                className="w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setSuccessMsg("");
                }}
              >
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                返回上一步
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
