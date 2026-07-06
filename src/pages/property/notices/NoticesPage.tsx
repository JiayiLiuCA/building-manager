import { Megaphone, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { deriveNoticeStatus, getAllNotices, noticeScopeLabel } from '@/data/selectors/noticeSelectors'
import { getNoticeScopeOptions } from '@/data/selectors/scope'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { Notice, NoticeScope, NoticeType } from '@/data/types'
import { addHours, DEMO_TODAY } from '@/lib/date'
import { formatDateTime } from '@/lib/format'
import { noticeStatusMap, noticeTypeMap } from '@/lib/statusMaps'

export function NoticesPage() {
  const scoped = useScopedData()
  const publishNotice = useAppStore((s) => s.publishNotice)
  const revokeNotice = useAppStore((s) => s.revokeNotice)
  const [searchParams, setSearchParams] = useSearchParams()

  const notices = getAllNotices(scoped)
  const opts = getNoticeScopeOptions(scoped)

  // ===== 新建通知(?new=1&fromWorkOrder=WO-xxx 一键预填,懒初始化避免 effect)=====
  const isNew = searchParams.get('new') === '1'
  const fromWoId = searchParams.get('fromWorkOrder')
  const initialWo = isNew && fromWoId ? scoped.workOrders.find((w) => w.id === fromWoId) : undefined

  const [open, setOpen] = useState(isNew)
  const [relatedWoId, setRelatedWoId] = useState<string | undefined>(initialWo?.id)
  const [title, setTitle] = useState(() =>
    initialWo ? `公共区域维修施工公告:${initialWo.description.slice(0, 12)}` : '',
  )
  const [type, setType] = useState<NoticeType>(initialWo ? 'public_repair' : 'general')
  const [content, setContent] = useState(() =>
    initialWo
      ? `${initialWo.description}。物业已安排集中维修施工,施工期间现场将设置围挡与安全提示,请提前告知员工绕行,给您带来不便敬请谅解。`
      : '',
  )
  const [scopeLevel, setScopeLevel] = useState<NoticeScope['level']>(() => {
    if (initialWo?.location?.buildingId) return 'building'
    if (initialWo?.location?.zoneId) return 'zone'
    return opts.canPark ? 'park' : 'zone'
  })
  const [scopeZoneId, setScopeZoneId] = useState(() => initialWo?.location?.zoneId ?? opts.zoneIds[0] ?? '')
  const [scopeBuildingId, setScopeBuildingId] = useState(
    () => initialWo?.location?.buildingId ?? opts.buildingIds[0] ?? '',
  )
  const [scopeCompanyId, setScopeCompanyId] = useState(() => opts.companyIds[0] ?? '')
  const [startAt, setStartAt] = useState(`${DEMO_TODAY}T08:00`)
  const [endAt, setEndAt] = useState(() => addHours(`${DEMO_TODAY}T18:00:00`, 72).slice(0, 16))

  // ===== 查看通知全文 =====
  const [viewNotice, setViewNotice] = useState<Notice | undefined>()

  const resetForm = () => {
    setRelatedWoId(undefined)
    setTitle('')
    setType('general')
    setContent('')
    setScopeLevel(opts.canPark ? 'park' : 'zone')
    setScopeZoneId(opts.zoneIds[0] ?? '')
    setScopeBuildingId(opts.buildingIds[0] ?? '')
    setScopeCompanyId(opts.companyIds[0] ?? '')
    setStartAt(`${DEMO_TODAY}T08:00`)
    setEndAt(addHours(`${DEMO_TODAY}T18:00:00`, 72).slice(0, 16))
  }

  const closeDialog = () => {
    setOpen(false)
    resetForm()
    if (searchParams.has('new') || searchParams.has('fromWorkOrder')) {
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      next.delete('fromWorkOrder')
      setSearchParams(next, { replace: true })
    }
  }

  const openWorkOrderDetail = (woId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', woId)
    setSearchParams(next, { replace: true })
    setViewNotice(undefined)
  }

  const scopeReady =
    scopeLevel === 'park' ||
    (scopeLevel === 'zone' && !!scopeZoneId) ||
    (scopeLevel === 'building' && !!scopeBuildingId) ||
    (scopeLevel === 'company' && !!scopeCompanyId)
  const canSubmit = title.trim() !== '' && content.trim() !== '' && scopeReady && !!startAt && !!endAt

  const handlePublish = () => {
    const scope: NoticeScope =
      scopeLevel === 'park'
        ? { level: 'park' }
        : scopeLevel === 'zone'
          ? { level: 'zone', zoneId: scopeZoneId }
          : scopeLevel === 'building'
            ? { level: 'building', buildingId: scopeBuildingId }
            : { level: 'company', companyIds: [scopeCompanyId] }
    publishNotice({
      type,
      title: title.trim(),
      content: content.trim(),
      scope,
      startAt: `${startAt}:00`,
      endAt: `${endAt}:00`,
      relatedWorkOrderId: relatedWoId,
    })
    toast.success('通知已发布,相关企业首页即时可见')
    closeDialog()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="通知管理"
        description="公共区域维修 / 停水 / 停电 / 一般公告 · 按影响范围触达企业端首页 · 客服发布范围限于管辖企业"
      >
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> 发布通知
        </Button>
      </PageHeader>

      <Card className="py-0">
        <CardContent className="p-0">
          {notices.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Megaphone} title="暂无通知" description="点击右上角「发布通知」新建" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">通知号</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="max-w-64">标题</TableHead>
                  <TableHead>影响范围</TableHead>
                  <TableHead>生效时间段</TableHead>
                  <TableHead>发布人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-20 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n) => {
                  const status = deriveNoticeStatus(n)
                  return (
                    <TableRow key={n.id} className="cursor-pointer" onClick={() => setViewNotice(n)}>
                      <TableCell className="pl-4 font-mono text-xs">{n.id}</TableCell>
                      <TableCell>
                        <StatusBadge meta={noticeTypeMap[n.type]} />
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.relatedWorkOrderId && (
                          <p className="text-xs text-muted-foreground">关联工单 {n.relatedWorkOrderId}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{noticeScopeLabel(n, scoped)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(n.startAt)}
                        <br />~ {formatDateTime(n.endAt)}
                      </TableCell>
                      <TableCell className="text-sm">{n.publishedBy}</TableCell>
                      <TableCell>
                        <StatusBadge meta={noticeStatusMap[status]} />
                      </TableCell>
                      <TableCell className="text-right">
                        {status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                撤销
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>撤销通知</AlertDialogTitle>
                                <AlertDialogDescription>
                                  撤销后企业端首页将不再展示「{n.title}」,历史记录仍可查询。确认撤销?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    revokeNotice(n.id)
                                    toast.success('通知已撤销,企业端即时生效')
                                  }}
                                >
                                  确认撤销
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ===== 查看全文 ===== */}
      <Dialog open={!!viewNotice} onOpenChange={(o) => !o && setViewNotice(undefined)}>
        <DialogContent className="sm:max-w-lg">
          {viewNotice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                  {viewNotice.title}
                  <StatusBadge meta={noticeTypeMap[viewNotice.type]} />
                  <StatusBadge meta={noticeStatusMap[deriveNoticeStatus(viewNotice)]} />
                </DialogTitle>
                <DialogDescription>
                  {noticeScopeLabel(viewNotice, scoped)} · {viewNotice.publishedBy} 发布于{' '}
                  {formatDateTime(viewNotice.publishedAt)}
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm leading-relaxed">{viewNotice.content}</p>
              <p className="text-xs text-muted-foreground">
                生效时间:{formatDateTime(viewNotice.startAt)} ~ {formatDateTime(viewNotice.endAt)}
                {viewNotice.revokedAt && `(已于 ${formatDateTime(viewNotice.revokedAt)} 撤销)`}
              </p>
              {viewNotice.relatedWorkOrderId && (
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => openWorkOrderDetail(viewNotice.relatedWorkOrderId!)}>
                    查看关联工单 {viewNotice.relatedWorkOrderId}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 发布通知 ===== */}
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>发布通知</DialogTitle>
            <DialogDescription>
              {opts.canPark
                ? '通知将按影响范围推送至相关企业端首页。'
                : '您是客服账号,影响范围仅限自己管辖的企业及其所在的区 / 楼栋。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {relatedWoId && (
              <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                由公共区域维修工单 {relatedWoId} 一键生成,已预填标题 / 内容 / 影响范围,可直接调整后发布。
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">通知类型</Label>
                <Select value={type} onValueChange={(v) => setType(v as NoticeType)}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(noticeTypeMap) as NoticeType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {noticeTypeMap[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">影响范围</Label>
                <Select value={scopeLevel} onValueChange={(v) => setScopeLevel(v as NoticeScope['level'])}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.canPark && <SelectItem value="park">全园区</SelectItem>}
                    <SelectItem value="zone">指定区</SelectItem>
                    <SelectItem value="building">指定楼栋</SelectItem>
                    <SelectItem value="company">指定企业</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {scopeLevel === 'zone' && (
              <div className="space-y-1.5">
                <Label className="text-xs">选择区</Label>
                <Select value={scopeZoneId} onValueChange={setScopeZoneId}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="选择区" />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.zoneIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {scoped.zones.find((z) => z.id === id)?.name ?? id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scopeLevel === 'building' && (
              <div className="space-y-1.5">
                <Label className="text-xs">选择楼栋</Label>
                <Select value={scopeBuildingId} onValueChange={setScopeBuildingId}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="选择楼栋" />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.buildingIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {scoped.buildings.find((b) => b.id === id)?.no ?? id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scopeLevel === 'company' && (
              <div className="space-y-1.5">
                <Label className="text-xs">选择企业</Label>
                <Select value={scopeCompanyId} onValueChange={setScopeCompanyId}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="选择企业" />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.companyIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {scoped.companies.find((c) => c.id === id)?.name ?? id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如:停电检修通知:B 区高压设备年检" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">内容</Label>
              <Textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="说明影响范围、时间段与注意事项"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">生效开始</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">生效结束</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button disabled={!canSubmit} onClick={handlePublish}>
              发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
