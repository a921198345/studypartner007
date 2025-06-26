export default function LearningPlanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 移除 AuthGuard，允许用户直接访问
  // 登录提醒将在用户点击创建计划时触发
  return <>{children}</>;
}