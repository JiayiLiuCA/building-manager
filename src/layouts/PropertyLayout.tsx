import {
  Building2,
  Car,
  ChevronsUpDown,
  ClipboardCheck,
  Droplets,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  ShieldCheck,
  Smile,
  TrendingUp,
  UserCog,
  UserRound,
  Wallet,
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
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { COMPANY_NAME, PARK_NAME, SYSTEM_NAME } from '@/data/constants'
import { useAppStore } from '@/data/store'
import type { Role } from '@/data/types'
import { roleHome } from '@/lib/nav'
import { DetailDialogHost } from '@/pages/property/work-orders/DetailDialogHost'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  match: string[]
  /** 仅主管可见 */
  supervisorOnly?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/property/dashboard', label: '驾驶舱', icon: LayoutDashboard, match: ['/property/dashboard'] },
      { to: '/property/daily-report', label: '日报', icon: FileText, match: ['/property/daily-report'] },
    ],
  },
  {
    label: '经营管理',
    items: [
      { to: '/property/revenue/property', label: '物业服务收费', icon: Wallet, match: ['/property/revenue/property'] },
      { to: '/property/revenue/vehicle', label: '车辆服务收费', icon: Car, match: ['/property/revenue/vehicle'] },
      { to: '/property/revenue/utility', label: '水电能耗收费', icon: Droplets, match: ['/property/revenue/utility'] },
      { to: '/property/revenue/value-added', label: '增值服务收入', icon: TrendingUp, match: ['/property/revenue/value-added'] },
    ],
  },
  {
    label: '服务品质',
    items: [
      { to: '/property/service/work-orders', label: '维修工单', icon: Wrench, match: ['/property/service/work-orders'] },
      { to: '/property/service/maintenance', label: '维保工单', icon: ShieldCheck, match: ['/property/service/maintenance'] },
      { to: '/property/service/satisfaction', label: '客户满意度', icon: Smile, match: ['/property/service/satisfaction'] },
    ],
  },
  {
    label: '内控管理',
    items: [
      { to: '/property/internal/inspections', label: '日常巡检', icon: ClipboardCheck, match: ['/property/internal/inspections'] },
      { to: '/property/internal/meters', label: '能耗核抄', icon: Gauge, match: ['/property/internal/meters'] },
      { to: '/property/internal/tasks', label: '工作任务清单', icon: ListChecks, match: ['/property/internal/tasks'] },
    ],
  },
  {
    items: [
      { to: '/property/notices', label: '通知管理', icon: Megaphone, match: ['/property/notices'] },
      { to: '/property/companies', label: '企业档案', icon: Building2, match: ['/property/companies'] },
      { to: '/property/permissions', label: '权限设置', icon: UserCog, match: ['/property/permissions'], supervisorOnly: true },
    ],
  },
]

/** 演示账号一键互切(同一标签页内存联动) */
const SWITCH_ACCOUNTS: { username: string; label: string }[] = [
  { username: 'admin', label: '主管 陈志远' },
  { username: 'cs_wang', label: '客服 王琳(A/B 区)' },
  { username: 'cs_liu', label: '客服 刘洋(C 区)' },
  { username: 'company1', label: '企业① 云脉智能科技' },
  { username: 'company2', label: '企业② 精工精密制造' },
  { username: 'company3', label: '企业③ 洄澜餐饮管理' },
]

const ROLE_LABEL: Record<Role, string> = { supervisor: '主管', cs: '客服', company: '企业管理员' }

export function PropertyLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const accounts = useAppStore((s) => s.accounts)
  const loginAs = useAppStore((s) => s.loginAs)
  const logout = useAppStore((s) => s.logout)

  const switchTo = (username: string) => {
    const account = accounts.find((a) => a.username === username)
    if (!account) return
    loginAs(username)
    navigate(roleHome(account.role))
  }

  const isSupervisor = currentUser?.role === 'supervisor'

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">{SYSTEM_NAME}</span>
              <span className="truncate text-xs text-muted-foreground">{PARK_NAME} · 管理后台</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter((item) => !item.supervisorOnly || isSupervisor)
            if (items.length === 0) return null
            return (
              <SidebarGroup key={group.label ?? `g${gi}`}>
                {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.label}
                          isActive={item.match.some((m) => pathname.startsWith(m))}
                        >
                          <NavLink to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </SidebarContent>
        <SidebarFooter>
          <p className="truncate px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {COMPANY_NAME}
          </p>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <span className="text-sm font-medium">{PARK_NAME}</span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {currentUser?.displayName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{currentUser?.displayName}</span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {currentUser ? ROLE_LABEL[currentUser.role] : ''} · {currentUser?.username}
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
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
      {/* 工单 / 投诉详情 Modal:任何物业端页面均可通过 ?detail= 参数原地打开 */}
      <DetailDialogHost />
    </SidebarProvider>
  )
}
