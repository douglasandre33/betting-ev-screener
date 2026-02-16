import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Betting EV Screener',
  description: 'MVP dashboard for screening betting expected value opportunities.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
