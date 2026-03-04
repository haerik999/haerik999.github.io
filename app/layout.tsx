import type { Metadata, Viewport } from "next";
import Link from 'next/link';
import "./globals.css";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { SearchTrigger } from "@/components/SearchTrigger";

const siteURL = "https://haerik999.github.io";
const siteTitle = "Haerik";
const siteDescription =
  "개발에 대해 배우고 학습한 개념들을 정리하는 블로그입니다.";

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

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <link rel="canonical" href={siteURL} />
        <link
          rel="stylesheet"
          href="https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CommandPaletteProvider>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
            <div className="max-w-[960px] mx-auto px-6 h-[60px] flex items-center justify-between">
              <Link href="/" className="text-lg font-bold text-gray-900 hover:opacity-80 transition-opacity">
                Haerik
              </Link>
              <nav className="flex items-center gap-6">
                <Link href="/archive" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Archive
                </Link>
                <SearchTrigger />
              </nav>
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 max-w-[960px] mx-auto px-6 w-full">
            {children}
          </div>

          {/* Footer */}
          <footer className="bg-black mt-auto">
            <div className="max-w-[960px] mx-auto px-6 py-10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Haerik</span>
                <div className="flex items-center gap-4">
                  <Link href="/archive" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    Archive
                  </Link>
                  <Link href="https://github.com/haerik999" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    GitHub
                  </Link>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-4">&copy; Haerik</p>
            </div>
          </footer>
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
