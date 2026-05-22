import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "Nexus AI",
  description: "Collaborative agentic planning workspace for software teams.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
