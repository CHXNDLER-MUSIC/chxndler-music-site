import "./globals.css";

export const metadata = {
  title: "CHXNDLER • Heartverse",
  description: "A home for Aliens — unapologetic, unfiltered, united through music.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-black via-fuchsia-950 to-black text-white">
        {children}
      </body>
    </html>
  );
}
