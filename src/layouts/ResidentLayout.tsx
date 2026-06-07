import { Bot, Building2, CircleUserRound, CreditCard, LogOut, MessageSquareWarning, MonitorCog, Wrench } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/data/store'
import { cn } from '@/lib/utils'
import { DunningNoticeDialog } from '@/pages/resident/DunningNoticeDialog'

const TABS = [
  { to: '/resident/payments', label: '我的缴费', icon: CreditCard },
  { to: '/resident/work-orders', label: '报修工单', icon: Wrench },
  { to: '/resident/complaints', label: '投诉', icon: MessageSquareWarning },
  { to: '/resident/chat', label: 'AI 咨询', icon: Bot },
  { to: '/resident/profile', label: '我的', icon: CircleUserRound },
]

export function ResidentLayout() {
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const household = useAppStore((s) => s.households.find((h) => h.id === s.currentUser?.householdId))
  const loginAs = useAppStore((s) => s.loginAs)
  const logout = useAppStore((s) => s.logout)

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="text-sm font-semibold">和美生活</span>
            <span className="text-xs text-muted-foreground">业主自助服务</span>
          </div>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto flex-col items-end gap-0 px-2 py-1">
                  <span className="text-sm font-medium">{currentUser?.displayName}</span>
                  <span className="max-w-40 truncate text-xs font-normal text-muted-foreground">
                    {household?.householdNo}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    loginAs('admin')
                    navigate('/property/dashboard')
                  }}
                >
                  <MonitorCog /> 切换演示:物业端
                </DropdownMenuItem>
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
        <nav className="mx-auto flex w-full max-w-2xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <tab.icon className="size-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        <Outlet />
      </main>
      {/* 催缴弹窗:进入业主端时若有进行中的催缴记录,自动弹出(每次会话一次) */}
      <DunningNoticeDialog />
    </div>
  )
}
