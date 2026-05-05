import "./globals.css";

export const metadata = {
  title: "SubFlow",
  description: "Local recurring income and expense planner"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
