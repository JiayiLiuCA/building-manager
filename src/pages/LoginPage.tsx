import { Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SYSTEM_NAME } from '@/data/constants'
import { useAppStore } from '@/data/store'
import type { Role } from '@/data/types'

const DEMO_ACCOUNTS: Record<Role, { username: string; label: string }[]> = {
  property: [{ username: 'admin', label: '物业管理员 admin' }],
  resident: [
    { username: 'zhangwei', label: '业主 张伟' },
    { username: 'liqiang', label: '业主 李强' },
  ],
}

export function LoginPage() {
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const accounts = useAppStore((s) => s.accounts)
  const login = useAppStore((s) => s.login)

  const [role, setRole] = useState<Role>('property')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentUser) {
    return <Navigate to={currentUser.role === 'property' ? '/property/dashboard' : '/resident/payments'} replace />
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
    navigate(account?.role === 'resident' ? '/resident/payments' : '/property/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-100 via-background to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-2xl">{SYSTEM_NAME}</CardTitle>
          <CardDescription>智慧物业经营管理平台 · 演示环境</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="property">物业端</TabsTrigger>
              <TabsTrigger value="resident">业主端</TabsTrigger>
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
              {DEMO_ACCOUNTS[role].map((a) => (
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
