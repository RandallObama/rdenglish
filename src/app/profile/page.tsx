"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ShieldCheck, Mail, Phone, User, Clock, Key, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getBtnStyle } from "@/lib/button-colors";
import { maskPhone } from "@/lib/phone-utils";
import { differenceInDays, addDays, format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lastNicknameChange: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── 认证守卫 ──
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ── 数据加载 ──
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // ── 昵称 ──
  const [nickname, setNickname] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);

  // ── 邮箱 ──
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // ── 手机号绑定 ──
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const phoneCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 修改密码 ──
  const [pwCode, setPwCode] = useState("");
  const [pwSending, setPwSending] = useState(false);
  const [pwCountdown, setPwCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const pwCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 通用错误 ──
  const [globalError, setGlobalError] = useState("");
  // 各模块独立错误
  const [nicknameError, setNicknameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [pwError, setPwError] = useState("");

  // ── 加载个人信息 ──
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setGlobalError(data.error);
        } else {
          setProfile(data);
          setNickname(data.name || "");
        }
      })
      .catch(() => {
        setGlobalError("加载个人信息失败");
      })
      .finally(() => setPageLoading(false));
  }, [status]);

  // ── 短信倒计时 ──
  const startPhoneCountdown = useCallback(() => {
    setPhoneCountdown(60);
    phoneCountdownRef.current = setInterval(() => {
      setPhoneCountdown((prev) => {
        if (prev <= 1) {
          if (phoneCountdownRef.current) clearInterval(phoneCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startPwCountdown = useCallback(() => {
    setPwCountdown(60);
    pwCountdownRef.current = setInterval(() => {
      setPwCountdown((prev) => {
        if (prev <= 1) {
          if (pwCountdownRef.current) clearInterval(pwCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (phoneCountdownRef.current) clearInterval(phoneCountdownRef.current);
      if (pwCountdownRef.current) clearInterval(pwCountdownRef.current);
    };
  }, []);

  // ── 计算昵称冷却 ──
  const nicknameCooldown = profile?.lastNicknameChange
    ? (() => {
        const daysSince = differenceInDays(new Date(), new Date(profile.lastNicknameChange));
        if (daysSince < 7) return { active: true, remaining: 7 - daysSince };
        return { active: false, remaining: 0 };
      })()
    : { active: false, remaining: 0 };

  // ── 修改昵称 ──
  const handleNickname = async () => {
    setNicknameError("");
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length > 50) {
      setNicknameError("昵称长度需在 1-50 个字符之间");
      return;
    }
    setNicknameLoading(true);
    try {
      const res = await fetch("/api/profile/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNicknameError(data.error || "修改失败");
        return;
      }
      setProfile((prev) =>
        prev ? { ...prev, name: trimmed, lastNicknameChange: data.lastNicknameChange } : prev
      );
      toast.success("昵称修改成功");
    } catch {
      setNicknameError("网络错误，请稍后重试");
    } finally {
      setNicknameLoading(false);
    }
  };

  // ── 发送手机绑定验证码 ──
  const handleSendPhoneCode = async () => {
    setPhoneError("");
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      setPhoneError("请输入有效的手机号");
      return;
    }
    setPhoneSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneError(data.error || "发送失败");
        return;
      }
      if (data.devCode) {
        toast.success("验证码已发送（开发模式）", {
          description: `验证码: ${data.devCode}`,
          duration: 15000,
        });
        setPhoneCode(data.devCode);
      } else {
        toast.success("验证码已发送");
      }
      startPhoneCountdown();
    } catch {
      setPhoneError("网络错误，请稍后重试");
    } finally {
      setPhoneSending(false);
    }
  };

  // ── 绑定手机号 ──
  const handleBindPhone = async () => {
    setPhoneError("");
    if (!phoneCode || phoneCode.length !== 6) {
      setPhoneError("请输入6位验证码");
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/profile/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, code: phoneCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneError(data.error || "绑定失败");
        return;
      }
      setProfile((prev) => (prev ? { ...prev, phone: newPhone } : prev));
      setNewPhone("");
      setPhoneCode("");
      toast.success("手机号绑定成功");
    } catch {
      setPhoneError("网络错误，请稍后重试");
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── 发送修改密码验证码 ──
  const handleSendPwCode = async () => {
    setPwError("");
    setPwSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profile?.phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "发送失败");
        return;
      }
      if (data.devCode) {
        toast.success("验证码已发送（开发模式）", {
          description: `验证码: ${data.devCode}`,
          duration: 15000,
        });
        setPwCode(data.devCode);
      } else {
        toast.success("验证码已发送到绑定手机");
      }
      startPwCountdown();
    } catch {
      setPwError("网络错误，请稍后重试");
    } finally {
      setPwSending(false);
    }
  };

  // ── 绑定邮箱 ──
  const handleBindEmail = async () => {
    setEmailError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "绑定失败");
        return;
      }
      setProfile((prev) => (prev ? { ...prev, email: newEmail.trim().toLowerCase() } : prev));
      setNewEmail("");
      toast.success("邮箱绑定成功");
    } catch {
      setEmailError("网络错误，请稍后重试");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── 修改密码 ──
  const handleChangePassword = async () => {
    setPwError("");
    if (!pwCode || pwCode.length !== 6) {
      setPwError("请输入6位验证码");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("密码至少需要 6 位");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pwCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "修改失败");
        return;
      }
      setPwCode("");
      setNewPassword("");
      toast.success("密码修改成功，请牢记新密码");
    } catch {
      setPwError("网络错误，请稍后重试");
    } finally {
      setPwLoading(false);
    }
  };

  // ── 加载中 ──
  if (status === "loading" || (pageLoading && status !== "unauthenticated")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 未登录：等 useEffect 跳转，先显示 loading 避免白屏闪烁
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 已登录但数据加载失败：显示错误信息
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        {globalError ? (
          <div className="space-y-4">
            <p className="text-destructive">{globalError}</p>
            <Button onClick={() => window.location.reload()} style={getBtnStyle("profile:retry")}>
              重新加载
            </Button>
          </div>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        )}
      </div>
    );
  }

  // 格式化注册日期
  const createdDate = profile.createdAt
    ? format(new Date(profile.createdAt), "yyyy年M月d日", { locale: zhCN })
    : "未知";

  const avatarChar = (profile.name || profile.email || profile.phone || "U")[0].toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* ── 页面标题 ── */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">个人中心</h1>
        <p className="text-sm text-muted-foreground mt-2">管理你的账号信息与安全设置</p>
      </div>

      {globalError && (
        <p className="text-sm text-destructive text-center mb-4">{globalError}</p>
      )}

      <div className="space-y-6">
        {/* ═══ 1. 基本信息 ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {avatarChar}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {profile.name || "未设置昵称"}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email || "未绑定邮箱"}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone ? maskPhone(profile.phone) : "未绑定手机号"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {createdDate} 加入
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 2. 修改昵称 ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              修改昵称
              {nicknameCooldown.active && (
                <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  距下次修改还有 {nicknameCooldown.remaining} 天
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="你的昵称（1-50字符）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={nicknameCooldown.active}
                maxLength={50}
                className="flex-1"
              />
              <Button
                onClick={handleNickname}
                disabled={nicknameLoading || nicknameCooldown.active}
                className="shrink-0"
                style={getBtnStyle("profile:save-nickname")}
              >
                {nicknameLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "保存"
                )}
              </Button>
            </div>
            {nicknameError && (
              <p className="text-sm text-destructive">{nicknameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              昵称每 7 天可修改一次
            </p>
          </CardContent>
        </Card>

        {/* ═══ 3. 绑定邮箱 ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Mail className="h-5 w-5" />
              绑定邮箱
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.email ? (
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>已绑定：</span>
                <span className="font-medium">{profile.email}</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleBindEmail}
                    disabled={emailLoading || !newEmail}
                    className="shrink-0"
                    style={getBtnStyle("profile:bind-email")}
                  >
                    {emailLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "绑定"
                    )}
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  绑定后可使用邮箱登录，暂不支持修改已绑定邮箱
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══ 4. 绑定手机号 ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Phone className="h-5 w-5" />
              绑定手机号
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.phone ? (
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>已绑定：</span>
                <span className="font-medium">{maskPhone(profile.phone)}</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                    maxLength={11}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendPhoneCode}
                    disabled={phoneSending || phoneCountdown > 0 || !/^1[3-9]\d{9}$/.test(newPhone)}
                    className="shrink-0"
                    style={getBtnStyle("profile:send-phone-code")}
                  >
                    {phoneSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : phoneCountdown > 0 ? (
                      `${phoneCountdown}秒后重发`
                    ) : (
                      "发送验证码"
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6位验证码"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleBindPhone}
                    disabled={phoneLoading || !phoneCode}
                    className="shrink-0"
                    style={getBtnStyle("profile:bind-phone")}
                  >
                    {phoneLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "绑定"
                    )}
                  </Button>
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  绑定后可使用手机号登录和重置密码，暂不支持修改已绑定手机号
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══ 5. 修改密码 ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Key className="h-5 w-5" />
              修改密码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!profile.phone ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <ShieldCheck className="h-4 w-4" />
                <span>请先绑定手机号，然后即可修改密码</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendPwCode}
                    disabled={pwSending || pwCountdown > 0}
                    className="shrink-0"
                    style={getBtnStyle("profile:send-pw-code")}
                  >
                    {pwSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : pwCountdown > 0 ? (
                      `${pwCountdown}秒后重发`
                    ) : (
                      "发送验证码到手机"
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">
                    验证码将发送至 {maskPhone(profile.phone)}
                  </span>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="6位验证码"
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="新密码（至少6位）"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleChangePassword}
                    disabled={pwLoading || !pwCode || !newPassword}
                    className="shrink-0"
                    style={getBtnStyle("profile:change-password")}
                  >
                    {pwLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "修改密码"
                    )}
                  </Button>
                </div>
                {pwError && (
                  <p className="text-sm text-destructive">{pwError}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
