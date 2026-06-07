import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAppStore } from '@/data/store'
import type { Role } from '@/data/types'

/** 角色守卫:未登录 → 登录页;角色不符 → 各自首页 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const currentUser = useAppStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'property' ? '/property/dashboard' : '/resident/payments'} replace />
  }
  return children
}

/** 根路径分流 */
export function RootRedirect() {
  const currentUser = useAppStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={currentUser.role === 'property' ? '/property/dashboard' : '/resident/payments'} replace />
}
