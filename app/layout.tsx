import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono, Space_Mono, Syne} from "next/font/google";
import "./globals.css";
import { UserProvider } from "./provider/UserProvider";
import Navbar from "./components/AxonNav";
import { dark } from "./dark";

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
        className={`${Space_mono.className} ${syne.className} antialiased bg-white dark:bg-black`}
      >
        <div data-theme={dark ? "light" : "dark"} style={{ minHeight: "100vh" }}>
        <div className="dv-wrap">
        <div className="dv-dot-grid" />
        <div className="dv-glow dv-glow-1" />
        <div className="dv-glow dv-glow-2" />
        <div className="dv-glow dv-glow-3" />
        <Navbar />
        
        {children}
        </div>
        </div>
      </body>
      </UserProvider>
    </html>
  );
}
