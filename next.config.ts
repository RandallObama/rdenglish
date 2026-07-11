import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片自动优化为 WebP/AVIF 格式（兼容浏览器自动选择）
  images: {
    formats: ["image/webp", "image/avif"],
  },

  async headers() {
    return [
      // 静态资源长期缓存
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
