import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Big Two Scorekeeper',
  description: 'Keep track of family Big Two games, rounds, and history.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
