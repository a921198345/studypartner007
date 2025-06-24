export default function KnowledgeMapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 移除 AuthGuard，允许用户直接访问
  // 登录提醒将在用户首次使用需要认证的功能时触发
  return <>{children}</>;
}