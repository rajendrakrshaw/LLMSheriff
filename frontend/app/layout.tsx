import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { VisitNotifier } from "@/components/VisitNotifier";
import { profile, siteSeo, siteUrl, softwareSchema } from "@/lib/site";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteSeo.title,
    template: `%s | ${siteSeo.siteName}`,
  },
  description: siteSeo.description,
  keywords: siteSeo.keywords,
  authors: [{ name: profile.name, url: profile.website }],
  creator: profile.name,
  publisher: profile.name,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteSeo.locale,
    url: siteUrl,
    siteName: siteSeo.siteName,
    title: siteSeo.title,
    description: siteSeo.description,
    images: [
      {
        url: siteSeo.image,
        width: 1200,
        height: 630,
        alt: "LLMSheriff research prototype",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.title,
    description: siteSeo.description,
    images: [siteSeo.image],
  },
  other: {
    "theme-color": siteSeo.themeColor,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <VisitNotifier />
        {children}
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </body>
    </html>
  );
}
