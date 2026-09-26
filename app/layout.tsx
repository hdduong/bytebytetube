import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Caveat, Roboto } from "next/font/google";
import { ThemeProvider, type Theme } from "@/components/theme-switch";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get("cinematube-theme")?.value;
  const theme: Theme = saved === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${roboto.variable} ${poster.variable} ${script.variable} h-full antialiased`}
      style={{ colorScheme: theme }}
    >
      <body className={`${roboto.className} min-h-full`}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
