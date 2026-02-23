import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAllPosts, buildCategoryTree } from "@/lib/posts";
import { SidebarProvider } from "@/components/sidebar/SidebarProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MobileMenuButton } from "@/components/MobileMenuButton";

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
  "개발에 대해 배우고 학습한 개념들을 정리하는 위키입니다.";

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
    "개발 위키",
    "지식 베이스",
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
    '@type': 'WebSite',
    name: siteTitle,
    description: siteDescription,
    url: siteURL,
    author: {
      '@type': 'Person',
      name: 'haerik999',
    },
    inLanguage: 'ko-KR',
  };

  const posts = getAllPosts();
  const categoryTree = buildCategoryTree(posts);

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
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar categoryTree={categoryTree} />
            <main className="flex-1 min-w-0">
              <MobileMenuButton />
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
