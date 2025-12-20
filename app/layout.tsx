import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Big Two Scorekeeper',
  description: 'Keep track of family Big Two games, rounds, and history.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="Keep track of family Big Two games, rounds, and history." />
        <meta name="theme-color" content="#111827" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Big Two Scorekeeper" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
