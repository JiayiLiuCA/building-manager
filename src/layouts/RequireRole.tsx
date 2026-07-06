import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAppStore } from '@/data/store'
import { roleHome } from '@/lib/nav'
import type { Role } from '@/data/types'

/** 路由守卫:未登录跳登录页;角色不在允许名单则跳各自首页 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const currentUser = useAppStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (!roles.includes(currentUser.role)) return <Navigate to={roleHome(currentUser.role)} replace />
  return children
}

/** 根路径分流 */
export function RootRedirect() {
  const currentUser = useAppStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(currentUser.role)} replace />
}
