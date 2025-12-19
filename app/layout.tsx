import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteURL = "https://haerik999.github.io";
const siteTitle = "Learning Dev";
const siteDescription =
  "개발을 공부하며 정리한 개념들을 공유하는 블로그입니다. JavaScript, React, Next.js, TypeScript 등 다양한 개발 주제를 다룹니다.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "개발 블로그",
    "JavaScript",
    "React",
    "Next.js",
    "TypeScript",
    "웹 개발",
    "프론트엔드",
  ],
  authors: [{ name: "haerik999" }],
  creator: "haerik999",
  robots: "index, follow",
  alternates: {
    canonical: siteURL,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteURL,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteTitle,
    description: siteDescription,
    url: siteURL,
    author: {
      '@type': 'Person',
      name: 'haerik999',
    },
    inLanguage: 'ko-KR',
  };

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <link rel="canonical" href={siteURL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
