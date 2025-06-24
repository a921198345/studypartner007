export default function QuestionBankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 移除 FlexibleAuthGuard，直接返回 children
  // 登录提醒将在用户首次使用功能时触发
  return <>{children}</>;
}