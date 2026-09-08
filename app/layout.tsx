import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laurem Recruitment Portal',
  description: 'Laurem Caregroup recruitment and workforce platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
