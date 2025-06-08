import '../styles/globals.css';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: '学习搭子 - 智能法考辅助平台',
  description: '一站式法考学习解决方案，包含AI问答、知识导图、真题练习和个性化学习计划',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
