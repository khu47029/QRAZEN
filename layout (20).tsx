import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "QRAZEN — Content Becomes Access",
    template: "%s | QRAZEN",
  },
  description:
    "Enterprise-grade dynamic QR infrastructure. Transform files, documents, bundles, and URLs into immutable, password-gated, and editable access portals.",
  icons: {
    icon: "/brand/qrazen-mark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
