import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://subflow.local"),
  title: {
    default: "SubFlow - personal ledger for recurring income & expenses",
    template: "%s | SubFlow"
  },
  description:
    "An offline-first ledger for tracking recurring income, expenses, and monthly cashflow rhythm. Plan the year in a quiet, paper-grade calendar.",
  applicationName: "SubFlow",
  keywords: ["personal finance", "subscriptions", "recurring expenses", "ledger", "cashflow"],
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" }
    ],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    type: "website",
    title: "SubFlow - personal ledger for recurring income & expenses",
    description:
      "Offline-first ledger for recurring income and expenses. A quiet, paper-grade view of your monthly and yearly cashflow.",
    siteName: "SubFlow",
    images: [
      {
        url: "/subflow-og.png",
        width: 1536,
        height: 1024,
        alt: "SubFlow - a quiet ledger for personal finance"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "SubFlow - personal ledger",
    description: "Offline-first ledger for recurring income and expenses.",
    images: ["/subflow-og.png"]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ece4d1",
  colorScheme: "light"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
