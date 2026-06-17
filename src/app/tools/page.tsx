import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const items = [
  { label: "笔记本", href: "/notebook", desc: "保存和管理词汇与语法笔记" },
  { label: "语法病历", href: "/grammar-patterns", desc: "分析语法薄弱点与典型错误" },
  { label: "学习报告", href: "/report", desc: "查看学习趋势与分数变化" },
  { label: "单词本", href: "/wordbooks", desc: "和好友共建共享协作背单词" },
];

const colorPairs = [
  { text: "#312F2C", bg: "#ABD1C6" },
  { text: "#ABD1C6", bg: "#312F2C" },
  { text: "#312F2C", bg: "#ABD1C6" },
  { text: "#ABD1C6", bg: "#312F2C" },
];

export default async function ToolsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl font-bold text-center mb-10">小工具</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
