// 全局业务常量(seed、selectors、UI 共用)

export const SYSTEM_NAME = '和美物业 AI OS'
export const COMPANY_NAME = '和美物业服务有限公司'
export const PARK_NAME = '和美产业园'

/** 园区物业服务费单价:元/㎡·月 */
export const PROPERTY_FEE_RATE = 18
/** 固定车位:元/个·月 */
export const FIXED_PARKING_FEE = 300
/** 租赁车位:元/个·月 */
export const LEASED_PARKING_FEE = 500

/** 维修完成时效承诺(小时),超过且未完工即视为超时工单 */
export const SLA_HOURS = 48
/** 维修响应(接单)时效承诺(小时) */
export const RESPONSE_SLA_HOURS = 4
/** 维保按期执行容差(小时):实际执行晚于计划超过此值视为不及时 */
export const MAINTENANCE_GRACE_HOURS = 24

/** 收缴率目标,低于此值驾驶舱告警 */
export const COLLECTION_TARGET = 0.9
/** 客服热线 */
export const SERVICE_PHONE = '400-100-8866'
