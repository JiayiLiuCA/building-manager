import { create } from 'zustand'
import { addHours, demoNow } from '../lib/date'
import {
  nextComplaintId,
  nextFollowUpId,
  nextInvoiceId,
  nextNoticeId,
  nextSurveyId,
  nextWorkOrderId,
} from '../lib/id'
import { deptMap, getWoStatusMeta, paymentMethodMap } from '../lib/statusMaps'
import { PROPERTY_FEE_RATE } from './constants'
import { CHAT_GREETING, matchChatReply } from './mock-content/chatRules'
import { buildSeedData } from './seed'
import { getArrears } from './selectors/billingSelectors'
import { getFollowUpSuggestion } from './selectors/followUpSelectors'
import { getActiveNoticesForCompany } from './selectors/noticeSelectors'
import { deriveWorkOrderStatus, getCompanyWorkOrders } from './selectors/workOrderSelectors'
import type {
  AppData,
  ChatContext,
  ChatMessage,
  Complaint,
  ComplaintEvent,
  CurrentUser,
  DeptCode,
  FeeCategory,
  FollowUpRecord,
  Invoice,
  Notice,
  NoticeScope,
  NoticeType,
  PaymentHabit,
  Survey,
  SurveyResponse,
  WorkOrder,
  WorkOrderCategory,
  WorkOrderEvent,
  WorkOrderLocation,
} from './types'

// ============================================================
// 单一内存 Store:物业端(主管/客服)与企业端读写同一份数据,跨端实时联动。
// 不做持久化 —— 刷新页面即重置为 seed 状态,便于反复演示。
// 动作模式:改实体 + append 事件(状态由事件派生,详见 selectors)。
// 权限:读取经 selectors/scope.ts;写入动作按当前角色语义组装操作人。
// ============================================================

export interface AppStore extends AppData {
  currentUser: CurrentUser | null
  /** 本次会话已弹过的收款跟进提醒(保证每次登录只弹一次) */
  seenFollowUpIds: string[]
  chatMessages: ChatMessage[]

  // 认证
  login: (username: string, password: string) => boolean
  /** 演示用快捷切换账号(免密) */
  loginAs: (username: string) => void
  logout: () => void

  // 工单(企业报事报修:报修→接单→派单→预约→完工→签字关单→评价;
  //      公共区域维修:登记→…→完工→物业验收关单)
  createWorkOrder: (input: { category: WorkOrderCategory; description: string }) => string | undefined
  createPublicWorkOrder: (input: {
    category: WorkOrderCategory
    description: string
    location: WorkOrderLocation
  }) => string | undefined
  acceptWorkOrder: (id: string) => void
  dispatchWorkOrder: (id: string, dept: DeptCode, staffId: string) => void
  setAppointment: (id: string, atIso: string) => void
  submitCompletion: (id: string, note: string) => void
  signAndCloseWorkOrder: (id: string) => void
  /** 公共区域维修:物业验收关单 */
  acceptancePublicWorkOrder: (id: string) => void
  rateWorkOrder: (id: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string) => void

  // 投诉(含主管介入升级链)
  createComplaint: (input: { content: string; workOrderId?: string }) => string | undefined
  dispatchComplaint: (id: string, dept: DeptCode) => void
  replyComplaint: (id: string, content: string) => void
  requestSupervisor: (id: string, reason: string) => void
  supervisorReply: (id: string, content: string) => void
  closeComplaint: (id: string) => void

  // 缴费
  payBills: (billIds: string[]) => void

  // 收款跟进
  startFollowUp: (companyId: string) => void
  markFollowUpSeen: (recordId: string) => void

  // 通知
  publishNotice: (input: {
    type: NoticeType
    title: string
    content: string
    scope: NoticeScope
    startAt: string
    endAt: string
    relatedWorkOrderId?: string
  }) => string | undefined
  revokeNotice: (id: string) => void

  // 发票
  uploadInvoice: (input: {
    companyId: string
    month: string
    category: FeeCategory
    amount: number
    fileName: string
  }) => void

  // 满意度调研
  publishSurvey: (input: { title: string; periodLabel: string }) => void
  submitSurveyResponse: (input: { surveyId: string; scores: Record<string, number>; comment?: string }) => void

  // 任务清单
  completeTask: (id: string) => void

  // 权限设置(仅主管)
  setCsAssignment: (csUsername: string, companyIds: string[]) => void

  // 企业档案:缴费习惯(客服/主管编辑)
  updatePaymentHabit: (companyId: string, habit: PaymentHabit) => void

  // AI 咨询
  sendChatMessage: (text: string) => void
}

function appendWoEvent(
  workOrders: WorkOrder[],
  id: string,
  event: WorkOrderEvent | WorkOrderEvent[],
  patch?: Partial<WorkOrder>,
): WorkOrder[] {
  const events = Array.isArray(event) ? event : [event]
  return workOrders.map((wo) => (wo.id === id ? { ...wo, ...patch, events: [...wo.events, ...events] } : wo))
}

function appendComplaintEvent(
  complaints: Complaint[],
  id: string,
  event: ComplaintEvent,
  patch?: Partial<Complaint>,
): Complaint[] {
  return complaints.map((c) => (c.id === id ? { ...c, ...patch, events: [...c.events, event] } : c))
}

function buildChatContext(s: AppStore): ChatContext {
  const companyId = s.currentUser?.companyId
  const company = s.companies.find((c) => c.id === companyId)
  const arrears = companyId ? getArrears(s, companyId) : { amount: 0, months: 0, bills: [] }
  const openWos = companyId
    ? getCompanyWorkOrders(s, companyId).filter((wo) => deriveWorkOrderStatus(wo) !== 'closed')
    : []
  const notices = companyId ? getActiveNoticesForCompany(s, companyId) : []
  const habit = company?.paymentHabit
  return {
    companyName: company?.name ?? s.currentUser?.displayName ?? '贵司',
    locationLabel: company
      ? `${company.zoneId} 区 ${company.buildingId} 栋${company.occupancy.type === 'whole' ? '(整栋)' : ` ${company.occupancy.unitLabel}`}`
      : '',
    areaSqm: company?.areaSqm ?? 0,
    monthlyPropertyFee: company ? Math.round(company.areaSqm * PROPERTY_FEE_RATE) : 0,
    arrearsAmount: arrears.amount,
    arrearsMonths: arrears.months,
    openWorkOrders: openWos.map((wo) => ({
      id: wo.id,
      statusLabel: getWoStatusMeta(deriveWorkOrderStatus(wo), wo.kind).label,
    })),
    activeNoticeTitles: notices.map((n) => n.title),
    habitText: habit ? `每月 ${habit.payDay} 日${paymentMethodMap[habit.method]}` : undefined,
  }
}

const initialChat: ChatMessage[] = [{ id: 'M-1', role: 'ai', content: CHAT_GREETING, at: demoNow() }]

export const useAppStore = create<AppStore>()((set, get) => ({
  ...buildSeedData(),
  currentUser: null,
  seenFollowUpIds: [],
  chatMessages: initialChat,

  // ===== 认证 =====
  login: (username, password) => {
    const account = get().accounts.find((a) => a.username === username && a.password === password)
    if (!account) return false
    get().loginAs(account.username)
    return true
  },

  loginAs: (username) => {
    const account = get().accounts.find((a) => a.username === username)
    if (!account) return
    set({
      currentUser: {
        role: account.role,
        username: account.username,
        displayName: account.displayName,
        companyId: account.companyId,
      },
    })
  },

  logout: () => set({ currentUser: null }),

  // ===== 工单 =====
  createWorkOrder: ({ category, description }) => {
    const s = get()
    const companyId = s.currentUser?.companyId
    if (!companyId) return undefined
    const company = s.companies.find((c) => c.id === companyId)
    const id = nextWorkOrderId(s.workOrders)
    const wo: WorkOrder = {
      id,
      kind: 'company',
      companyId,
      category,
      description,
      events: [
        { type: 'REPORTED', at: demoNow(), by: company?.contactName ?? s.currentUser!.displayName, note: description },
      ],
    }
    set({ workOrders: [...s.workOrders, wo] })
    return id
  },

  createPublicWorkOrder: ({ category, description, location }) => {
    const s = get()
    if (!s.currentUser || s.currentUser.role === 'company') return undefined
    const id = nextWorkOrderId(s.workOrders)
    const wo: WorkOrder = {
      id,
      kind: 'public',
      location,
      category,
      description,
      events: [
        { type: 'REPORTED', at: demoNow(), by: s.currentUser.displayName, note: `登记公共区域维修:${description}` },
      ],
    }
    set({ workOrders: [...s.workOrders, wo] })
    return id
  },

  acceptWorkOrder: (id) => {
    const by = get().currentUser?.displayName ?? '物业客服'
    set((s) => ({
      workOrders: appendWoEvent(s.workOrders, id, { type: 'ACCEPTED', at: demoNow(), by, note: '物业确认受理' }),
    }))
  },

  dispatchWorkOrder: (id, dept, staffId) => {
    const s = get()
    const staff = s.staff.find((x) => x.id === staffId)
    const by = s.currentUser?.displayName ?? '物业'
    set({
      workOrders: appendWoEvent(
        s.workOrders,
        id,
        { type: 'DISPATCHED', at: demoNow(), by, note: `派单至${deptMap[dept]} ${staff?.name ?? ''}`.trim() },
        { assignedDept: dept, assignedStaffId: staffId },
      ),
    })
  },

  setAppointment: (id, atIso) => {
    const s = get()
    const wo = s.workOrders.find((x) => x.id === id)
    const staff = s.staff.find((x) => x.id === wo?.assignedStaffId)
    set({
      workOrders: appendWoEvent(
        s.workOrders,
        id,
        {
          type: 'APPOINTMENT_SET',
          at: demoNow(),
          by: staff?.name ?? s.currentUser?.displayName ?? '物业',
          note: `预约处理时间 ${atIso.slice(0, 10)} ${atIso.slice(11, 16)}`,
        },
        { appointmentAt: atIso },
      ),
    })
  },

  submitCompletion: (id, note) => {
    const s = get()
    const wo = s.workOrders.find((x) => x.id === id)
    const staff = s.staff.find((x) => x.id === wo?.assignedStaffId)
    set({
      workOrders: appendWoEvent(
        s.workOrders,
        id,
        { type: 'COMPLETED', at: demoNow(), by: staff?.name ?? '维修人员', note },
        { completionNote: note },
      ),
    })
  },

  signAndCloseWorkOrder: (id) => {
    const now = demoNow()
    const s = get()
    const wo = s.workOrders.find((x) => x.id === id)
    const company = s.companies.find((c) => c.id === wo?.companyId)
    const by = company?.contactName ?? s.currentUser?.displayName ?? '企业'
    set({
      workOrders: appendWoEvent(s.workOrders, id, [
        { type: 'SIGNED', at: now, by, note: '企业电子签字确认' },
        { type: 'CLOSED', at: addHours(now, 0.01), by: '系统', note: '签字完成,自动关单' },
      ]),
    })
  },

  acceptancePublicWorkOrder: (id) => {
    const by = get().currentUser?.displayName ?? '物业'
    set((s) => ({
      workOrders: appendWoEvent(s.workOrders, id, { type: 'CLOSED', at: demoNow(), by, note: '物业验收合格,关单' }),
    }))
  },

  rateWorkOrder: (id, rating, comment) => {
    const s = get()
    const wo = s.workOrders.find((x) => x.id === id)
    const company = s.companies.find((c) => c.id === wo?.companyId)
    const by = company?.contactName ?? s.currentUser?.displayName ?? '企业'
    set({
      workOrders: appendWoEvent(
        s.workOrders,
        id,
        { type: 'RATED', at: demoNow(), by, note: comment },
        { satisfactionRating: rating, ratingComment: comment },
      ),
    })
  },

  // ===== 投诉 =====
  createComplaint: ({ content, workOrderId }) => {
    const s = get()
    const companyId = s.currentUser?.companyId
    if (!companyId) return undefined
    const company = s.companies.find((c) => c.id === companyId)
    const id = nextComplaintId(s.complaints)
    const complaint: Complaint = {
      id,
      companyId,
      workOrderId,
      content,
      events: [{ type: 'CREATED', at: demoNow(), by: company?.contactName ?? s.currentUser!.displayName, content }],
    }
    set({ complaints: [...s.complaints, complaint] })
    return id
  },

  dispatchComplaint: (id, dept) => {
    const by = get().currentUser?.displayName ?? '物业'
    set((s) => ({
      complaints: appendComplaintEvent(
        s.complaints,
        id,
        { type: 'DISPATCHED', at: demoNow(), by, dept, content: `已转${deptMap[dept]}限期处理` },
        { responsibleDept: dept },
      ),
    }))
  },

  replyComplaint: (id, content) => {
    const by = get().currentUser?.displayName ?? '责任部门'
    set((s) => ({
      complaints: appendComplaintEvent(s.complaints, id, { type: 'REPLIED', at: demoNow(), by, content }),
    }))
  },

  requestSupervisor: (id, reason) => {
    const s = get()
    const complaint = s.complaints.find((c) => c.id === id)
    const company = s.companies.find((c) => c.id === complaint?.companyId)
    set({
      complaints: appendComplaintEvent(s.complaints, id, {
        type: 'SUPERVISOR_REQUESTED',
        at: demoNow(),
        by: company?.contactName ?? s.currentUser?.displayName ?? '企业',
        content: reason,
      }),
    })
  },

  supervisorReply: (id, content) => {
    const by = get().currentUser?.displayName ?? '主管'
    set((s) => ({
      complaints: appendComplaintEvent(s.complaints, id, { type: 'SUPERVISOR_REPLIED', at: demoNow(), by, content }),
    }))
  },

  closeComplaint: (id) => {
    const s = get()
    const complaint = s.complaints.find((c) => c.id === id)
    const company = s.companies.find((c) => c.id === complaint?.companyId)
    set({
      complaints: appendComplaintEvent(s.complaints, id, {
        type: 'CLOSED',
        at: demoNow(),
        by: s.currentUser?.role === 'company' ? (company?.contactName ?? '企业') : (s.currentUser?.displayName ?? '物业'),
        content: '确认解决,投诉关闭',
      }),
    })
  },

  // ===== 缴费 =====
  payBills: (billIds) => {
    const now = demoNow()
    set((s) => {
      const idSet = new Set(billIds)
      const bills = s.bills.map((b) => (idSet.has(b.id) ? { ...b, paidAmount: b.amount, paidAt: now } : b))
      // 欠费清零的企业:active 收款跟进自动转 resolved(实时联动核心)
      const affected = new Set(s.bills.filter((b) => idSet.has(b.id) && b.companyId).map((b) => b.companyId as string))
      const followUpRecords = s.followUpRecords.map((r) => {
        if (r.status !== 'active' || !affected.has(r.companyId)) return r
        const stillOwing = bills.some((b) => b.companyId === r.companyId && b.paidAmount < b.amount)
        return stillOwing ? r : { ...r, status: 'resolved' as const, resolvedAt: now }
      })
      return { bills, followUpRecords }
    })
  },

  // ===== 收款跟进 =====
  startFollowUp: (companyId) => {
    const s = get()
    const arrears = getArrears(s, companyId)
    if (arrears.amount <= 0) return
    const record: FollowUpRecord = {
      id: nextFollowUpId(s.followUpRecords),
      companyId,
      createdAt: demoNow(),
      byUsername: s.currentUser?.username ?? 'admin',
      arrearsAmountSnapshot: arrears.amount,
      arrearsMonthsSnapshot: arrears.months,
      suggestionSnapshot: getFollowUpSuggestion(s, companyId),
      status: 'active',
    }
    set({ followUpRecords: [...s.followUpRecords, record] })
  },

  markFollowUpSeen: (recordId) => {
    set((s) => ({ seenFollowUpIds: [...s.seenFollowUpIds, recordId] }))
  },

  // ===== 通知 =====
  publishNotice: (input) => {
    const s = get()
    if (!s.currentUser || s.currentUser.role === 'company') return undefined
    const id = nextNoticeId(s.notices)
    const notice: Notice = {
      id,
      ...input,
      publishedBy: s.currentUser.displayName,
      publishedByUsername: s.currentUser.username,
      publishedAt: demoNow(),
    }
    set({ notices: [...s.notices, notice] })
    return id
  },

  revokeNotice: (id) => {
    set((s) => ({
      notices: s.notices.map((n) => (n.id === id ? { ...n, revokedAt: demoNow() } : n)),
    }))
  },

  // ===== 发票 =====
  uploadInvoice: (input) => {
    const s = get()
    if (!s.currentUser || s.currentUser.role === 'company') return
    const invoice: Invoice = {
      id: nextInvoiceId(s.invoices),
      ...input,
      uploadedBy: s.currentUser.displayName,
      uploadedAt: demoNow(),
    }
    set({ invoices: [...s.invoices, invoice] })
  },

  // ===== 满意度调研 =====
  publishSurvey: ({ title, periodLabel }) => {
    const s = get()
    if (!s.currentUser || s.currentUser.role === 'company') return
    const survey: Survey = {
      id: nextSurveyId(s.surveys),
      title,
      periodLabel,
      status: 'active',
      publishedBy: s.currentUser.displayName,
      publishedAt: demoNow(),
    }
    set({ surveys: [...s.surveys, survey] })
  },

  submitSurveyResponse: ({ surveyId, scores, comment }) => {
    const s = get()
    const companyId = s.currentUser?.companyId
    if (!companyId) return
    const response: SurveyResponse = {
      id: `SRR-${String(s.surveyResponses.length + 1).padStart(3, '0')}`,
      surveyId,
      companyId,
      scores,
      comment,
      submittedAt: demoNow(),
    }
    set({ surveyResponses: [...s.surveyResponses, response] })
  },

  // ===== 任务清单 =====
  completeTask: (id) => {
    set((s) => ({
      workTasks: s.workTasks.map((t) =>
        t.id === id ? { ...t, status: 'done' as const, completedAt: demoNow().slice(0, 10) } : t,
      ),
    }))
  },

  // ===== 权限设置 =====
  setCsAssignment: (csUsername, companyIds) => {
    set((s) => ({
      csAssignments: s.csAssignments.map((a) => {
        if (a.csUsername === csUsername) return { ...a, companyIds: [...companyIds] }
        // 同一企业只归属一位客服:从其他客服名单中移除
        return { ...a, companyIds: a.companyIds.filter((id) => !companyIds.includes(id)) }
      }),
    }))
  },

  // ===== 企业档案:缴费习惯 =====
  updatePaymentHabit: (companyId, habit) => {
    set((s) => ({
      companies: s.companies.map((c) => (c.id === companyId ? { ...c, paymentHabit: { ...habit } } : c)),
    }))
  },

  // ===== AI 咨询 =====
  sendChatMessage: (text) => {
    const s = get()
    const userMsg: ChatMessage = {
      id: `M-${s.chatMessages.length + 1}`,
      role: 'user',
      content: text,
      at: demoNow(),
    }
    set({ chatMessages: [...s.chatMessages, userMsg] })
    const reply = matchChatReply(text, buildChatContext(s))
    setTimeout(() => {
      set((cur) => ({
        chatMessages: [
          ...cur.chatMessages,
          { id: `M-${cur.chatMessages.length + 1}`, role: 'ai', content: reply, at: demoNow() },
        ],
      }))
    }, 600)
  },
}))
