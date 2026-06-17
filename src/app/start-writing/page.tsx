import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const items = [
  { label: "翻译", href: "/write", desc: "中文翻译成地道英文，标注语法要点" },
  { label: "优化", href: "/optimize", desc: "AI 全方位优化改写你的英文文本" },
  { label: "批改", href: "/correct", desc: "按考试标准智能评分与逐句批注" },
];

const colorPairs = [
  { text: "#312F2C", bg: "#ABD1C6" },
  { text: "#ABD1C6", bg: "#312F2C" },
  { text: "#312F2C", bg: "#ABD1C6" },
];

export default async function StartWritingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-center mb-10">开始写作</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg text-center"
            style={{
              color: colorPairs[i].text,
              backgroundColor: colorPairs[i].bg,
            }}
          >
            <span className="text-xl font-bold">{item.label}</span>
            <span className="text-sm opacity-75">{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
