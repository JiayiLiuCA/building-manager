import type { Role } from '../data/types'

/** 各角色的默认首页(守卫、登录页、账号切换共用) */
export function roleHome(role: Role): string {
  return role === 'company' ? '/company/home' : '/property/dashboard'
}
