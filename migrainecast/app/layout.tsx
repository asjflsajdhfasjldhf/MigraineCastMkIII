import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppGate } from "@/components/AppGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MigraineCast",
  description: "Migraine forecasting and journaling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AppGate>{children}</AppGate>
      </body>
    </html>
  );
}
