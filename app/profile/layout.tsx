'use client';

import { AuthGuard } from '@/components/auth/auth-guard'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  )
}