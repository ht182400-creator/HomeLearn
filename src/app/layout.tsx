import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '家学 HomeLearn - 家庭智能学习平台',
  description: '打造家庭专属的智能学习平台，让家长成为孩子学习的智慧引路人',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
