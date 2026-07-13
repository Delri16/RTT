import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AppProvider } from "@/app/app-provider"
import UploadProgressIndicator from "@/components/upload-progress-indicator"

export const metadata: Metadata = {
  title: "Road To Toro",
  description: "Get fit with your friends for the Caribbean trip!",
  manifest: "/manifest.json",
  themeColor: "#FF6B6B",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Road To Toro",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Road To Toro" />
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="bg-toro-background">
        <AppProvider>
          <div className="w-full max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-2xl">
            {children}
            <UploadProgressIndicator />
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
