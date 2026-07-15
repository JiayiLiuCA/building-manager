import {
  Bot,
  Building2,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  Home,
  KeyRound,
  LogOut,
  ReceiptText,
  UserRound,
  Wrench,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PARK_NAME } from '@/data/constants'
import { useAppStore } from '@/data/store'
import { roleHome } from '@/lib/nav'
import { FollowUpNoticeDialog } from '@/pages/company/FollowUpNoticeDialog'

const TABS = [
  { to: '/company/home', label: '首页', icon: Home, match: ['/company/home'] },
  { to: '/company/locks', label: '门锁', icon: KeyRound, match: ['/company/locks'] },
  { to: '/company/work-orders', label: '报事报修', icon: Wrench, match: ['/company/work-orders', '/company/complaints'] },
  { to: '/company/bills', label: '账单缴费', icon: CreditCard, match: ['/company/bills'] },
  { to: '/company/invoices', label: '发票查询', icon: ReceiptText, match: ['/company/invoices'] },
  { to: '/company/survey', label: '满意度调研', icon: ClipboardList, match: ['/company/survey'] },
  { to: '/company/chat', label: 'AI 咨询', icon: Bot, match: ['/company/chat'] },
  { to: '/company/profile', label: '企业信息', icon: Building2, match: ['/company/profile'] },
]

/** 演示账号一键互切(与物业端同一份内存数据) */
const SWITCH_ACCOUNTS: { username: string; label: string }[] = [
  { username: 'admin', label: '物业端 · 主管 陈志远' },
  { username: 'cs_wang', label: '物业端 · 客服 王琳' },
  { username: 'cs_liu', label: '物业端 · 客服 刘洋' },
  { username: 'company1', label: '企业① 云脉智能科技' },
  { username: 'company2', label: '企业② 精工精密制造' },
  { username: 'company3', label: '企业③ 洄澜餐饮管理' },
]

export function CompanyLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentUser = useAppStore((s) => s.currentUser)
  const accounts = useAppStore((s) => s.accounts)
  const companies = useAppStore((s) => s.companies)
  const loginAs = useAppStore((s) => s.loginAs)
  const logout = useAppStore((s) => s.logout)

  const company = companies.find((c) => c.id === currentUser?.companyId)

  const switchTo = (username: string) => {
    const account = accounts.find((a) => a.username === username)
    if (!account) return
    loginAs(username)
    navigate(roleHome(account.role))
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="truncate text-sm font-semibold">{PARK_NAME} · 企业服务</span>
            <span className="truncate text-xs text-muted-foreground">{company?.name}</span>
          </div>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {company?.name?.slice(0, 1) ?? '企'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">{company?.contactName}</span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {company?.name} · {currentUser?.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">切换演示账号(同标签页联动)</DropdownMenuLabel>
                {SWITCH_ACCOUNTS.filter((a) => a.username !== currentUser?.username).map((a) => (
                  <DropdownMenuItem key={a.username} onClick={() => switchTo(a.username)}>
                    <UserRound /> {a.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                >
                  <LogOut /> 退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="mx-auto w-full max-w-4xl overflow-x-auto px-4 pb-2">
          <div className="flex gap-1.5">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={() =>
                  `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    tab.match.some((m) => pathname.startsWith(m))
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                <tab.icon className="size-4" />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <Outlet />
      </main>
      {/* 收款跟进提醒(弱化版缴费提醒):物业发起跟进后,企业进入即弹一次 */}
      <FollowUpNoticeDialog />
    </div>
  )
}
