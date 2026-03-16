import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניהול לימודים",
  description: "דשבורד ניהול מחלקת הלימודים",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
