import LoginForm from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return <LoginPageInner searchParams={searchParams} />;
}

async function LoginPageInner({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const rawCallback = params.callbackUrl || "/dashboard";
  // 防止开放重定向：只允许相对路径（以 / 开头且不含 // 绕过）
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.includes("//") && !rawCallback.startsWith("\\\\")
      ? rawCallback
      : "/dashboard";

  return (
    <div className="container mx-auto px-4 py-8 sm:py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
