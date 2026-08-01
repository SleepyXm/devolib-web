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
