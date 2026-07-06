import { Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PARK_NAME, SYSTEM_NAME } from '@/data/constants'
import { roleHome } from '@/lib/nav'
import { useAppStore } from '@/data/store'

/** 登录页按「端」分组展示演示账号(物业端含主管与客服两种角色) */
type Side = 'property' | 'company'

const DEMO_ACCOUNTS: Record<Side, { username: string; label: string }[]> = {
  property: [
    { username: 'admin', label: '主管 陈志远' },
    { username: 'cs_wang', label: '客服 王琳(A/B 区)' },
    { username: 'cs_liu', label: '客服 刘洋(C 区)' },
  ],
  company: [
    { username: 'company1', label: '企业① 云脉智能科技' },
    { username: 'company2', label: '企业② 精工精密制造' },
    { username: 'company3', label: '企业③ 洄澜餐饮管理' },
  ],
}

export function LoginPage() {
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const accounts = useAppStore((s) => s.accounts)
  const login = useAppStore((s) => s.login)

  const [side, setSide] = useState<Side>('property')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentUser) {
    return <Navigate to={roleHome(currentUser.role)} replace />
  }

  const fill = (name: string) => {
    setUsername(name)
    setPassword('123456')
    setError('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const account = accounts.find((a) => a.username === username.trim())
    if (!login(username.trim(), password)) {
      setError('用户名或密码错误,请重试(演示密码均为 123456)')
      return
    }
    navigate(account ? roleHome(account.role) : '/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-100 via-background to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-2xl">{SYSTEM_NAME}</CardTitle>
          <CardDescription>{PARK_NAME} · 产业园经营管理平台 · 演示环境</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={side} onValueChange={(v) => setSide(v as Side)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="property">物业端</TabsTrigger>
              <TabsTrigger value="company">企业端</TabsTrigger>
            </TabsList>
          </Tabs>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              登 录
            </Button>
          </form>

          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs text-muted-foreground">演示账号(点击一键填入,密码均为 123456):</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS[side].map((a) => (
                <Badge
                  key={a.username}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => fill(a.username)}
                >
                  {a.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
