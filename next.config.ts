import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": [
      "./public/fonts/Inter-Regular.ttf",
      "./public/fonts/Inter-Bold.ttf",
    ],
  },
};

export default nextConfig;
