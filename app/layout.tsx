import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./provider/UserProvider";
import Navbar from "./components/AxonNav";
import DotGrid from "./components/dotgrid";

const display = IBM_Plex_Sans({
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Devolib — LIDE",
    template: "%s · Devolib",
  },
  description:
    "A container-native development environment that discovers, runs, and explains your full-stack repository.",
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Devolib LIDE",
            "applicationCategory": "DeveloperApplication",
            "description": "Platform for Live interactive development in a cloud environment. Import a full-stack project, LIDE discovers how it is built, starts it inside an isolated runtime, and exposes the working parts in one interface.",
            "url": "https://devolib.com",
            "offers": { "@type": "Offer", "priceCurrency": "USD" }
          })}}
        />
      </head>
      <body>
        <UserProvider>
          <DotGrid />
          <Navbar />
          <div className="site-content">{children}</div>
        </UserProvider>
      </body>
    </html>
  );
}
