import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laurem Recruitment Portal',
  description: 'Laurem Caregroup recruitment and workforce platform',
};

export const viewport: Viewport = {
  themeColor: '#102a43',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
