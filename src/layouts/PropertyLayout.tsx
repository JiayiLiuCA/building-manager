import {
  BellRing,
  Building2,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  LogOut,
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
import { COMPANY_NAME, SYSTEM_NAME } from '@/data/constants'
import { useAppStore } from '@/data/store'
import { DetailDialogHost } from '@/pages/property/work-orders/DetailDialogHost'

const NAV = [
  { to: '/property/dashboard', label: '驾驶舱', icon: LayoutDashboard, match: ['/property/dashboard'] },
  { to: '/property/daily-report', label: '日报', icon: FileText, match: ['/property/daily-report'] },
  { to: '/property/work-orders', label: '工单 / 投诉', icon: Wrench, match: ['/property/work-orders'] },
  { to: '/property/dunning', label: '催缴', icon: BellRing, match: ['/property/dunning'] },
  {
    to: '/property/payments',
    label: '缴费 / 收款',
    icon: Wallet,
    match: ['/property/payments', '/property/households'],
  },
]

export function PropertyLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const loginAs = useAppStore((s) => s.loginAs)
  const logout = useAppStore((s) => s.logout)

  const switchTo = (username: string) => {
    loginAs(username)
    navigate('/resident/payments')
  }

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
              <span className="truncate text-xs text-muted-foreground">管理后台</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>经营管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
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
          <span className="text-sm font-medium">{COMPANY_NAME}</span>
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
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  物业管理员 · {currentUser?.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => switchTo('zhangwei')}>
                  <UserRound /> 切换演示:业主 张伟
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchTo('liqiang')}>
                  <UserRound /> 切换演示:业主 李强
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
