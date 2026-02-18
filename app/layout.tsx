import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono, Space_Mono, Syne} from "next/font/google";
import "./globals.css";
import { UserProvider } from "./provider/UserProvider";
import Navbar from "./components/AxonNav";
import SmoothScroll from "./components/scrollsmooth";
import Background from "./components/background";


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
        <Navbar />
        <Background >
        
        {children}
        </Background>
      </body>
      </UserProvider>
    </html>
  );
}
