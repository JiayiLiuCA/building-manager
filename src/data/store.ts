import { create } from 'zustand'
import { CURRENT_MONTH, demoNow, addHours } from '../lib/date'
import { nextComplaintId, nextDunningId, nextServiceTaskId, nextWorkOrderId } from '../lib/id'
import { deptMap, workOrderStatusMap } from '../lib/statusMaps'
import { PROPERTY_FEE_RATE } from './constants'
import { CHAT_GREETING, matchChatReply } from './mock-content/chatRules'
import { buildSeedData } from './seed'
import { getArrears } from './selectors/billingSelectors'
import { getDunningSuggestion } from './selectors/dunningSelectors'
import { deriveWorkOrderStatus, getHouseholdWorkOrders } from './selectors/workOrderSelectors'
import type {
  AppData,
  ChatContext,
  ChatMessage,
  Complaint,
  ComplaintEvent,
  CurrentUser,
  DeptCode,
  DunningRecord,
  ServiceTask,
  WorkOrder,
  WorkOrderCategory,
  WorkOrderEvent,
} from './types'

// ============================================================
// 单一内存 Store:物业端与业主端读写同一份数据,跨端实时联动。
// 不做持久化 —— 刷新页面即重置为 seed 状态,便于反复演示。
// 动作模式:改实体 + append 事件(状态由事件派生,详见 selectors)。
// ============================================================

export interface AppStore extends AppData {
  currentUser: CurrentUser | null
  /** 本次会话已弹过的催缴弹窗(保证每次登录只弹一次) */
  seenDunningIds: string[]
  chatMessages: ChatMessage[]

  // 认证
  login: (username: string, password: string) => boolean
  /** 演示用快捷切换账号(免密) */
  loginAs: (username: string) => void
  logout: () => void

  // 工单(业主发起 → 物业处理 → 业主签字闭环)
  createWorkOrder: (input: { category: WorkOrderCategory; description: string }) => string | undefined
  acceptWorkOrder: (id: string) => void
  dispatchWorkOrder: (id: string, dept: DeptCode, staffId: string) => void
  setAppointment: (id: string, atIso: string) => void
  submitCompletion: (id: string, note: string) => void
  signAndCloseWorkOrder: (id: string) => void
  rateWorkOrder: (id: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string) => void

  // 投诉(含主管介入升级链)
  createComplaint: (input: { content: string; workOrderId?: string }) => string | undefined
  dispatchComplaint: (id: string, dept: DeptCode) => void
  replyComplaint: (id: string, content: string) => void
  requestSupervisor: (id: string, reason: string) => void
  supervisorReply: (id: string, content: string) => void
  closeComplaint: (id: string) => void

  // 缴费与空置
  payBills: (billIds: string[]) => void
  setVacancy: (householdId: string, isVacant: boolean) => void
  completeServiceTask: (id: string) => void

  // 催缴
  startDunning: (householdId: string) => void
  reportDunning: (recordId: string) => void
  markDunningSeen: (recordId: string) => void

  // 个人信息 / AI 客服
  updateResidentProfile: (patch: { name?: string; phone?: string }) => void
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
  const hid = s.currentUser?.householdId
  const household = s.households.find((h) => h.id === hid)
  const arrears = hid ? getArrears(s, hid) : { amount: 0, months: 0, bills: [] }
  const openWos = hid
    ? getHouseholdWorkOrders(s, hid).filter((wo) => deriveWorkOrderStatus(wo) !== 'closed')
    : []
  return {
    ownerName: household?.ownerName ?? s.currentUser?.displayName ?? '业主',
    householdLabel: household?.householdNo ?? '',
    areaSqm: household?.areaSqm ?? 0,
    monthlyPropertyFee: household
      ? Math.round(household.areaSqm * PROPERTY_FEE_RATE * (household.isVacant ? 0.5 : 1))
      : 0,
    arrearsAmount: arrears.amount,
    arrearsMonths: arrears.months,
    openWorkOrders: openWos.map((wo) => ({
      id: wo.id,
      statusLabel: workOrderStatusMap[deriveWorkOrderStatus(wo)].label,
    })),
  }
}

const initialChat: ChatMessage[] = [{ id: 'M-1', role: 'ai', content: CHAT_GREETING, at: demoNow() }]

export const useAppStore = create<AppStore>()((set, get) => ({
  ...buildSeedData(),
  currentUser: null,
  seenDunningIds: [],
  chatMessages: initialChat,

  // ===== 认证 =====
  login: (username, password) => {
    const account = get().accounts.find((a) => a.username === username && a.password === password)
    if (!account) return false
    get().loginAs(account.username)
    return true
  },

  loginAs: (username) => {
    const s = get()
    const account = s.accounts.find((a) => a.username === username)
    if (!account) return
    const resident = account.residentId ? s.residents.find((r) => r.id === account.residentId) : undefined
    set({
      currentUser: {
        role: account.role,
        username: account.username,
        displayName: resident?.name ?? account.displayName,
        residentId: account.residentId,
        householdId: resident?.householdId,
      },
    })
  },

  logout: () => set({ currentUser: null }),

  // ===== 工单 =====
  createWorkOrder: ({ category, description }) => {
    const s = get()
    const hid = s.currentUser?.householdId
    if (!hid) return undefined
    const id = nextWorkOrderId(s.workOrders)
    const wo: WorkOrder = {
      id,
      householdId: hid,
      category,
      description,
      events: [{ type: 'REPORTED', at: demoNow(), by: s.currentUser!.displayName, note: description }],
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
          note: `预约上门时间 ${atIso.slice(0, 10)} ${atIso.slice(11, 16)}`,
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
    const by = get().currentUser?.displayName ?? '业主'
    set((s) => ({
      workOrders: appendWoEvent(s.workOrders, id, [
        { type: 'SIGNED', at: now, by, note: '业主电子签字确认' },
        { type: 'CLOSED', at: addHours(now, 0.01), by: '系统', note: '签字完成,自动关单' },
      ]),
    }))
  },

  rateWorkOrder: (id, rating, comment) => {
    const by = get().currentUser?.displayName ?? '业主'
    set((s) => ({
      workOrders: appendWoEvent(
        s.workOrders,
        id,
        { type: 'RATED', at: demoNow(), by, note: comment },
        { satisfactionRating: rating, ratingComment: comment },
      ),
    }))
  },

  // ===== 投诉 =====
  createComplaint: ({ content, workOrderId }) => {
    const s = get()
    const hid = s.currentUser?.householdId
    if (!hid) return undefined
    const id = nextComplaintId(s.complaints)
    const complaint: Complaint = {
      id,
      householdId: hid,
      workOrderId,
      content,
      events: [{ type: 'CREATED', at: demoNow(), by: s.currentUser!.displayName, content }],
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
    const by = get().currentUser?.displayName ?? '业主'
    set((s) => ({
      complaints: appendComplaintEvent(s.complaints, id, {
        type: 'SUPERVISOR_REQUESTED',
        at: demoNow(),
        by,
        content: reason,
      }),
    }))
  },

  supervisorReply: (id, content) => {
    const by = get().currentUser?.displayName ?? '主管'
    set((s) => ({
      complaints: appendComplaintEvent(s.complaints, id, { type: 'SUPERVISOR_REPLIED', at: demoNow(), by, content }),
    }))
  },

  closeComplaint: (id) => {
    const by = get().currentUser?.displayName ?? '业主'
    set((s) => ({
      complaints: appendComplaintEvent(s.complaints, id, {
        type: 'CLOSED',
        at: demoNow(),
        by,
        content: '确认解决,投诉关闭',
      }),
    }))
  },

  // ===== 缴费与空置 =====
  payBills: (billIds) => {
    const now = demoNow()
    set((s) => {
      const idSet = new Set(billIds)
      const bills = s.bills.map((b) => (idSet.has(b.id) ? { ...b, paidAmount: b.amount, paidAt: now } : b))
      // 欠费清零的户:active 催缴记录自动转 resolved
      const affected = new Set(s.bills.filter((b) => idSet.has(b.id)).map((b) => b.householdId))
      const dunningRecords = s.dunningRecords.map((r) => {
        if (r.status !== 'active' || !affected.has(r.householdId)) return r
        const stillOwing = bills.some((b) => b.householdId === r.householdId && b.paidAmount < b.amount)
        return stillOwing ? r : { ...r, status: 'resolved' as const, resolvedAt: now }
      })
      return { bills, dunningRecords }
    })
  },

  setVacancy: (householdId, isVacant) => {
    const now = demoNow()
    set((s) => {
      const households = s.households.map((h) =>
        h.id === householdId
          ? { ...h, isVacant, vacantSince: isVacant ? CURRENT_MONTH : undefined, anomaly: null }
          : h,
      )
      let bills = s.bills
      if (isVacant) {
        // 核实空置后的账单校准:未缴物业费按半价重算,未缴水电账单作废(停供)
        bills = s.bills.flatMap((b) => {
          if (b.householdId !== householdId || b.paidAmount >= b.amount) return [b]
          if (b.feeType === 'property') {
            return [{ ...b, amount: Math.round(b.amount / 2), isHalfPrice: true }]
          }
          return []
        })
      }
      const task: ServiceTask = {
        id: nextServiceTaskId(s.serviceTasks),
        householdId,
        type: isVacant ? 'CUT_UTILITIES' : 'RESTORE_UTILITIES',
        note: isVacant ? '住户登记空置,需停水停电并记录水电表底数' : '住户取消空置,需恢复水电供应并记录',
        status: 'open',
        createdAt: now,
      }
      return { households, bills, serviceTasks: [...s.serviceTasks, task] }
    })
  },

  completeServiceTask: (id) => {
    set((s) => ({
      serviceTasks: s.serviceTasks.map((t) => (t.id === id ? { ...t, status: 'done' as const } : t)),
    }))
  },

  // ===== 催缴 =====
  startDunning: (householdId) => {
    const s = get()
    const arrears = getArrears(s, householdId)
    if (arrears.amount <= 0) return
    const record: DunningRecord = {
      id: nextDunningId(s.dunningRecords),
      householdId,
      createdAt: demoNow(),
      arrearsAmountSnapshot: arrears.amount,
      arrearsMonthsSnapshot: arrears.months,
      suggestionSnapshot: getDunningSuggestion(s, householdId),
      status: 'active',
      isReported: false,
    }
    set({ dunningRecords: [...s.dunningRecords, record] })
  },

  reportDunning: (recordId) => {
    set((s) => ({
      dunningRecords: s.dunningRecords.map((r) =>
        r.id === recordId ? { ...r, isReported: true, reportedAt: demoNow() } : r,
      ),
    }))
  },

  markDunningSeen: (recordId) => {
    set((s) => ({ seenDunningIds: [...s.seenDunningIds, recordId] }))
  },

  // ===== 个人信息 =====
  updateResidentProfile: (patch) => {
    set((s) => {
      const user = s.currentUser
      if (!user?.residentId) return {}
      const residents = s.residents.map((r) =>
        r.id === user.residentId ? { ...r, name: patch.name ?? r.name, phone: patch.phone ?? r.phone } : r,
      )
      // 同步户档案的业主信息 → 物业端立即可见
      const households = s.households.map((h) =>
        h.id === user.householdId
          ? { ...h, ownerName: patch.name ?? h.ownerName, ownerPhone: patch.phone ?? h.ownerPhone }
          : h,
      )
      return {
        residents,
        households,
        currentUser: { ...user, displayName: patch.name ?? user.displayName },
      }
    })
  },

  // ===== AI 客服 =====
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
