import { useMemo } from 'react'
import { useAppStore } from '@/data/store'
import { getScopedData, getScopedInternal, type ScopedInternal, type ScopedState } from '@/data/selectors/scope'

/**
 * 页面读取企业相关数据的唯一入口(权限过滤后的视图)。
 * 纪律:页面禁止直接读 useAppStore 的 bills/workOrders 等原始数组。
 */
export function useScopedData(): ScopedState {
  const state = useAppStore()
  return useMemo(() => getScopedData(state), [state])
}

/** 内控数据(巡检/核抄/任务按人归属;维保物业角色全量;企业端为空) */
export function useScopedInternal(): ScopedInternal {
  const state = useAppStore()
  return useMemo(() => getScopedInternal(state), [state])
}
