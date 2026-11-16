import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/lib/auth-context";

import "./globals.css";

// ======================================================
// GREENSHARE — ROOT LAYOUT
// ======================================================

// ------------------------------------------------------
// FONTS
// ------------------------------------------------------

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ------------------------------------------------------
// METADATA
// ------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: "GreenShare | Community Tool Library",
    template: "%s | GreenShare",
  },

  description:
    "GreenShare is a community tool library concept " +
    "that encourages equipment sharing, affordable " +
    "borrowing and sustainable resource use.",

  applicationName: "GreenShare",

  keywords: [
    "GreenShare",
    "community tool library",
    "equipment rental",
    "tool sharing",
    "sustainability",
    "community equipment",
  ],

  robots: {
    index: false,
    follow: false,
  },
};

// ------------------------------------------------------
// ROOT LAYOUT
// ------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}