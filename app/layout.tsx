import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taekwondo Manager",
  description: "Taekwondo academy management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}