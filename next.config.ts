import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "pdfkit", "bidi-js", "pdf-parse", "mammoth"],
  outputFileTracingIncludes: {
    "/api/terms-acceptances": ["./public/fonts/**"],
  },
};

export default nextConfig;
