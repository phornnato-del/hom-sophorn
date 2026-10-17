import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TopLoadingBar from "@/feature/shared/TopLoadingBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hom Sophorn - Software Engineer & Creative Developer",
  description: "Selected work and digital experiences by Hom Sophorn, a creative developer.",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "Hom Sophorn - Software Engineer & Creative Developer",
    description: "Selected work and digital experiences by Hom Sophorn, a creative developer.",
    images: [{ url: "/logo.jpg", alt: "Hom Sophorn logo" }],
  },
  twitter: {
    card: "summary",
    title: "Hom Sophorn - Software Engineer & Creative Developer",
    description: "Selected work and digital experiences by Hom Sophorn, a creative developer.",
    images: [{ url: "/logo.jpg", alt: "Hom Sophorn logo" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopLoadingBar />
        {children}
      </body>
    </html>
  );
}
