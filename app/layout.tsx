import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fantasy Mate - FPL Team Analyzer',
  description:
    'Analyze your Fantasy Premier League team, get transfer recommendations, and optimize your chip strategy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-fpl-purple/20">
          {children}
        </div>
      </body>
    </html>
  );
}
