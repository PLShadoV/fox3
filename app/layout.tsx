export const metadata = { title: "FoxESS × RCE", description: "PV dashboard" };
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
