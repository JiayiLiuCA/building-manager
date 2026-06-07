import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/data/store'

export function ProfilePage() {
  const state = useAppStore()
  const updateResidentProfile = state.updateResidentProfile
  const resident = state.residents.find((r) => r.id === state.currentUser?.residentId)
  const household = state.households.find((h) => h.id === state.currentUser?.householdId)

  const [name, setName] = useState(resident?.name ?? '')
  const [phone, setPhone] = useState(resident?.phone ?? '')

  const dirty = name.trim() !== resident?.name || phone.trim() !== resident?.phone

  const save = () => {
    updateResidentProfile({ name: name.trim(), phone: phone.trim() })
    toast.success('个人信息已更新,物业端档案同步生效')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">个人信息</h1>
        <p className="text-xs text-muted-foreground">修改后将实时同步至物业端户档案</p>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">
              姓名
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">
              联系电话
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!dirty || !name.trim() || !phone.trim()} onClick={save}>
            保存修改
          </Button>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">房屋信息(由物业维护)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">房屋地址</dt>
              <dd className="font-medium">{household?.householdNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">建筑面积</dt>
              <dd className="font-medium tabular-nums">{household?.areaSqm}㎡</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">登录账号</dt>
              <dd className="font-medium">{state.currentUser?.username}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">* 房屋信息如有变更,请联系物业服务中心办理</p>
        </CardContent>
      </Card>
    </div>
  )
}
