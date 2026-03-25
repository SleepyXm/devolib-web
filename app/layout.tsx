import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono, Space_Mono, Syne, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./provider/UserProvider";
import Navbar from "./components/AxonNav";
import Background from "./components/background";
import SmoothScroll from "@/app/components/scrollsmooth"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const Dm_Mono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
});

const ibm_sans = IBM_Plex_Sans({
  variable: "--font-ibm-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
})

const syne = Syne({
  variable: "--font-dm-mono",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const Space_mono = Space_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevoLib",
  description: "Fullstack Development Made Easy.",
};

export default function RootLayout(
  {
  
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <UserProvider>
      <body
        className={`${ibm_sans.className}antialiased bg-white dark:bg-black`}
      >
        <SmoothScroll />
        <div id="smooth-wrapper">
          <div id="smooth-content">
        <Navbar />
        <Background>
        {children}
        </Background>
        </div>
        </div>

      </body>
      </UserProvider>
    </html>
  );
}
