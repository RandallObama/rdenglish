import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackButtonWrapper } from "@/components/BackButtonWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "英语写作助手 - 智能英语写作练习工具",
  description:
    "输入中文，智能翻译成地道英文，标注语法要点和词汇用法，让你的英语写作水平不断提升。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col safe-area-inset-bottom">
        <Providers>
          <Navbar />
          <main className="flex-1">
            <div className="px-4 pt-3">
              <BackButtonWrapper />
            </div>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
