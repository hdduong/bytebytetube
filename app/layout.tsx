import type { Metadata } from "next";
import { Bebas_Neue, Caveat, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const poster = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-poster",
  display: "swap",
});

const script = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CinemaTube",
  description: "Fresh movie reviews from creators you love",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${poster.variable} ${script.variable} h-full antialiased`}
    >
      <body className={`${roboto.className} min-h-full`}>{children}</body>
    </html>
  );
}
