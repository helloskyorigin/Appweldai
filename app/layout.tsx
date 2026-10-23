import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Appweld — Your website. Now an Android app.',
  description: 'Turn your website into a branded Android app. Design, preview and check before you pay. No accounts or subscriptions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
