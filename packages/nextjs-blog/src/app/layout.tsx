import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";
import Footer from "@/app/_components/footer";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const title = "Join Function";
const description =
    "We are responsible for hundreds of thousands of deployments to the cloud through automation. Learn some of these best practices.";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.fnjoin.com"),
    title,
    description,
    openGraph: {
        title,
        description,
    },

    twitter: {
        card: "summary_large_image",
        creator: "@archiecowan",
        title,
        description,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/favicon/apple-touch-icon.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/favicon/favicon-32x32.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/favicon/favicon-16x16.png"
                />
                <link rel="manifest" href="/favicon/site.webmanifest" />
                <link
                    rel="mask-icon"
                    href="/favicon/safari-pinned-tab.svg"
                    color="#000000"
                />
                <link rel="shortcut icon" href="/favicon/favicon.ico" />
                <meta name="msapplication-TileColor" content="#000000" />
                <meta
                    name="msapplication-config"
                    content="/favicon/browserconfig.xml"
                />
                <meta name="theme-color" content="#000" />
                <link
                    rel="alternate"
                    href="https://fnjoin.com/index.xml"
                    type="application/rss+xml"
                    title="fn:join"
                />
                <GoogleAnalytics gaId="G-ZPSKLMVM2V" />
            </head>
            <body className={inter.className}>
                <div className="min-h-screen">{children}</div>
                <Footer />
            </body>
        </html>
    );
}
