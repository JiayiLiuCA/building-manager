# 智能门锁模块设计(TTLock WiFi 锁 · 应用层权限方案)

> 2026-07-15 · 对应文档归档 docs/ttlock/,对接口径见其中 README「WiFi 版要点速览」。
> 方案前提(已确认):WiFi 锁默认长连接、远程开锁开关打开、单主账号 + 应用层权限,不存在多个 TTLock 账号。
> 演示实现:mock 数据模拟 TTLock 云端行为,操作即时生效并写入通行记录(模拟回调)。

## 0. 核心设计决策

1. **锁是园区资产,归属空间而非企业**。锁永久挂在 区/楼栋/楼层/门 上;与企业的关系是一条可回收的「分配记录」。企业退租 → 回收分配 → 空置 → 分配给新企业,历史链路完整留档。
2. **当前分配由分配历史派生**(与工单/投诉「事件数组派生状态」同款纪律):`LockAssignment.revokedAt` 为空的即当前分配,不在 DoorLock 上冗余存 companyId。
3. **通行记录带企业快照**:记录落库时写入当时的分配企业 id。换租户后,新企业看不到上家的记录(隐私),物业端全量可查(审计)。
4. **密码软删除**:删除/清退只打 `deletedAt` 标记,列表默认过滤,审计可切换显示。
5. **"谁开的门"由应用层记账**:远程开锁记录 `byUsername`(系统账号),对应真实对接时"TTLock 记录里操作人都是主账号,审计靠自己日志"的结论。

## 1. 数据结构(types.ts 新增)

```ts
// ===== 智能门锁(园区资产;当前分配由 lockAssignments 派生,不落库) =====
export type LockKind = 'unit' | 'building_gate' | 'public' // 单元门/楼栋大门/公共区域

export interface DoorLock {
  id: string            // 'LK-001'
  name: string          // 'A1 栋 301 门锁'
  kind: LockKind
  zoneId: string
  buildingId: string
  floor?: number        // 大门/公共锁可空
  doorLabel: string     // '301' / '一层大堂' / '强电井'
  sn: string            // 'TTL-8F2A31'(演示假 SN)
  model: string         // 'TTLock WiFi S31'
  installedAt: string   // ISO
  // —— 模拟 TTLock 云端实时状态(演示为静态种子,操作不改动) ——
  isOnline: boolean
  battery: number       // 0-100;≤20 视为低电量
  rssiGrade: 0 | 1 | 2 | 3 // WiFi 信号:3 强 2 中 1 差 0 未知
  remoteUnlockEnabled: boolean // 演示统一 true
  powerSavingMode: boolean     // 演示统一 false(可留 1 把 true 讲 -3035 故事)
}

/** 锁分配记录 —— 退租重分配的事实源;revokedAt 为空 = 当前生效 */
export interface LockAssignment {
  id: string               // 'LA-001'
  lockId: string
  companyId: string
  /** 企业名快照:企业迁出后档案仍能显示上一家名称 */
  companyNameSnapshot: string
  assignedAt: string
  assignedBy: string       // 操作人显示名
  revokedAt?: string
  revokedBy?: string
  revokeReason?: string    // '企业退租清退' / '单锁回收调整'
}

// ===== 密码(对应 TTLock keyboardPwd 两套方案) =====
export type PasscodeKind = 'random' | 'custom'
/** 随机密码:单次/限期/永久/循环(简化 TTLock type 1/3/2/6/7/5);自定义:限期/永久 */
export type PasscodeType = 'once' | 'period' | 'permanent' | 'cycle_daily' | 'cycle_weekday' | 'cycle_weekend'
export type PasscodePurpose = 'staff' | 'visitor' | 'cleaning' | 'other'

export interface LockPasscode {
  id: string          // 'PC-0001'
  lockId: string
  kind: PasscodeKind
  type: PasscodeType
  name: string        // 命名规范:'企业-用途-人名',通行记录靠它辨人
  code: string        // 4-9 位数字(演示明文)
  startAt: string
  endAt?: string      // permanent 无;循环类型 = 时段模板起止
  purpose: PasscodePurpose
  /** 归属企业;物业为公共锁/大门发的可空 */
  companyId?: string
  createdAt: string
  createdBy: string                       // 显示名
  createdByRole: 'property' | 'company'
  /** 软禁用(真实对接=改有效期挂起,可恢复) */
  disabledAt?: string
  /** 软删除(真实对接=deleteType 2 远程删除;保留审计) */
  deletedAt?: string
}
// 状态派生(selectors):deleted → 已删除(默认过滤) > disabled → 已禁用
// > now<startAt → 未生效 > endAt<now → 已过期 > 生效中

// ===== 通行记录(模拟 TTLock 回调推送) =====
export type UnlockMethod = 'remote' | 'passcode' | 'app_ble' | 'ic_card' | 'fingerprint'

export interface UnlockRecord {
  id: string        // 'UR-00001'
  lockId: string
  at: string
  method: UnlockMethod
  success: boolean
  /** 操作者描述:远程=账号显示名;密码=密码名称;蓝牙=钥匙持有人 */
  actorLabel: string
  /** 应用层审计:触发远程开锁的系统账号 */
  byUsername?: string
  /** 记录发生时锁的分配企业(快照;换租后旧记录不随锁转移) */
  companyId?: string
  passcodeId?: string
}

// ===== 客服门锁管辖(权限设置页第二区块;一把锁只归一位客服,互斥同企业名单) =====
export interface CsLockAssignment {
  csUsername: string
  lockIds: string[]
}
```

`AppData` 新增:`doorLocks` `lockAssignments` `lockPasscodes` `unlockRecords` `csLockAssignments`。
`lib/id.ts` 新增:`nextLockAssignmentId('LA-')` `nextPasscodeId('PC-', 4位)` `nextUnlockRecordId('UR-', 5位)`。
`lib/statusMaps.ts` 新增:lockKindMap / lockOnlineMap / passcodeKindMap / passcodeTypeMap / passcodeStatusMap(未生效·生效中·已禁用·已过期·已删除)/ unlockMethodMap。

## 2. 权限与范围(scope.ts 扩展)

```
visibleLockIds(state):
  supervisor → 全部
  cs         → csLockAssignments[username].lockIds
  company    → 当前分配给本企业的锁 + 本企业所在楼栋的 building_gate 锁(只可开门,不可管理)
```

getScopedData 增补过滤:
- doorLocks:按 visibleLockIds;空置单元锁企业端永不可见
- lockAssignments:物业按锁范围;企业按 companyId === 自己
- lockPasscodes:物业按锁范围;企业按 companyId === 自己(看不到物业发的保洁码等)
- unlockRecords:物业按锁范围;企业按 **companyId 快照** === 自己

管理动作守卫:企业端仅能对 kind='unit' 且当前分配=自己的锁增删改密码;大门锁只读+可开门。

## 3. Store 动作

```ts
remoteUnlock(lockId): boolean
// 校验:锁在范围内 && isOnline && remoteUnlockEnabled(离线返回 false,页面按钮已禁用兜底)
// 成功:append UnlockRecord{ method:'remote', actorLabel:当前账号显示名, byUsername, companyId:当前分配快照 }

createRandomPasscode({ lockId, type, name, startAt, endAt?, purpose, companyId? }) → { id, code }
// PRNG 生成 6 位数字;随机密码不要求锁在线(对应真实语义)
createCustomPasscode({ lockId, name, code, startAt, endAt?, purpose, companyId? }) → id | undefined
// 要求锁在线(对应 addType=2 需 WiFi 在线);4-9 位数字校验
setPasscodeDisabled(id, disabled)   // 软禁用/恢复
updatePasscode(id, { name?, code?, startAt?, endAt? })
deletePasscode(id)                  // 打 deletedAt

assignLock(lockId, companyId)       // 已有分配则先 revoke(换租语义),再新建 LockAssignment
revokeLock(lockId, reason)          // 结束当前分配 + 该锁上该企业的密码全部打 deletedAt
offboardCompanyLocks(companyId) → { locks, passcodes }
// 退租一键清退:回收该企业全部锁 + 相关密码全部删除;通行记录保留(快照归档)

setCsLockAssignment(csUsername, lockIds)  // 互斥:一把锁只归一位客服
```

## 4. 物业端 UX

### 4.1 导航
侧边栏最后一组(通知管理/企业档案/权限设置)中、企业档案之前插入:**门锁管理**(icon: Lock,路由 `/property/locks`)。页内三个 Tab(`?tab=` 参数,与企业档案同模式):设备总览 / 密码管理 / 通行记录。

### 4.2 设备总览(默认 Tab)
- KPI 行 5 枚:设备总数 / 在线(含率) / 低电量(≤20%) / 今日开锁次数 / 近 7 天异常(失败)
- 筛选:区·楼栋 / 类型 / 状态(在线·离线·低电量) / 企业关键字
- 表格:门锁名称(位置) · 类型 · 当前分配(企业名;单元锁未分配=「空置」badge;公共/大门=「公共」) · 在线 · 电量(≤20 红 ≤50 琥珀) · 信号 · 操作[远程开锁][详情]
- 远程开锁:直接执行 → toast「已发送开锁指令,A1 栋 301 门锁已开门」;离线时按钮禁用 + tooltip「设备离线」
- **锁详情 Dialog**(`?detail=LK-xxx`,复用 DetailDialogHost 模式):
  - 基本信息:名称/位置/SN/型号/安装时间
  - 状态卡:在线·电量·信号·省电模式·远程开锁开关(只读)+ [远程开锁]
  - 当前分配 + [分配给企业]/[回收](空置↔使用中)
  - 分配历史 timeline:companyNameSnapshot · assignedAt→revokedAt · reason(完整换租链)
  - 该锁密码简表(可新增)/ 该锁最近 10 条通行记录

### 4.3 密码管理 Tab
- [生成密码] Dialog:选锁(限管辖范围) → 方案(随机/自定义) → 类型(随机:单次·限期·永久·每日循环·工作日循环·周末循环;自定义:限期·永久) → 名称(placeholder 提示命名规范) → 自定义输 4-9 位 → 有效期 → 用途 → 归属企业(默认带出锁当前分配)
- 随机密码结果 Dialog:大号数字 + [复制密码话术]
- 表格:名称 · 锁 · 方案 · 类型 · 密码 · 有效期 · 状态 · 创建(人/端) · 操作[禁用|启用][修改][删除];「已删除」默认过滤,可切换显示(审计)
- 禁用 toast 说明软禁用语义:「已挂起有效期,可随时恢复」

### 4.4 通行记录 Tab
- 筛选:锁 / 企业 / 方式 / 结果 / 时间范围(默认近 7 天);顶部小结:次数·失败数
- 列表:时间 · 锁(位置) · 方式 badge · 操作者 · 归属企业 · 结果;失败行红色高亮

### 4.5 企业档案 · 新增「门锁 (n)」Tab
- 当前门锁表:锁名/位置/在线/电量/密码数(本企业)/操作[远程开锁][详情→跳门锁管理]
- 操作区:[分配门锁](Dialog 列出该企业所在楼栋的空置单元锁,勾选分配)
  [退租门锁清退](destructive outline)→ confirm Dialog 明示影响:「回收 N 把锁 → 空置;删除本企业 M 个密码;通行记录保留归档」
- 分配历史 timeline(含迁出企业快照名,展示"上一家 → 空置 → 本企业"完整链)

### 4.6 权限设置页扩展
每位客服卡片内,企业名单下方加「**门锁管理范围**」区块:按楼栋分组 checkbox + 全选/清空,一把锁只归一位客服(互斥逻辑同企业),保存按钮共用 dirty 态。文案提示:未勾选的锁在该客服的门锁管理页不可见不可操作。

### 4.7 P2(本期不做,设计留位)
驾驶舱门锁小卡(在线率/今日通行)·日报门锁异常段·通行趋势图(接 dataviz)·AI 客服门锁话术·IC 卡/指纹管理页。

## 5. 企业端 UX(小程序形态的 Web 映射)

### 5.1 导航
TABS 在「首页」后插入:**门锁**(icon: KeyRound,路由 `/company/locks`)。

### 5.2 首页「快捷开门」卡(一键开锁核心)
- 位置:生效通知之下、本月账单之上(高频动作最显眼)
- 每锁一行:[锁 icon] A1 栋 301 · 在线 · 电量 82% —— [一键开门](大按钮,primary)
- 交互:点击 → loading「开门中…」约 800ms → 变绿勾「已开门」2s 后复原;toast「A1 栋 301 已开门」;写通行记录(remote,actorLabel=联系人名)
- 离线:按钮禁用「设备离线」+ 副文案「请联系物业或使用密码开门」
- 超过 3 把:展示前 3 + 「全部 N 把 →」链接;楼栋大门锁同卡展示(标注「楼栋大门」,只可开门)
- 真实落地注记:微信小程序首页放同款按钮调后端 unlock API;可选 TTLock 小程序蓝牙插件做离线兜底

### 5.3 /company/locks(Tab:我的门锁 / 密码管理 / 通行记录)
- 我的门锁:每锁一卡(名称/位置/类型/在线/电量),低电量 amber 警示 + 「一键报修」(预填 door_access 工单);[一键开门]大按钮
- 密码管理:本企业密码表 + [新增密码](自定义或随机)+ 禁用/启用/修改/删除;顶部说明「密码可发给员工或访客,门锁键盘输入即可开门」
  - [生成访客密码]快捷按钮:访客称呼 + 到访时段(默认今日 9:00-18:00)+ 选锁 → 限期随机密码 → 结果 Dialog 大号密码 + [复制邀请话术]:「【和美产业园】您好,张先生:您的访客密码为 458923,有效期 6 月 6 日 9:00-18:00,请在 A1 栋 301 门锁键盘输入后按 # 开门。」
- 通行记录:本企业记录只读(时间/锁/方式/操作者/结果)

### 5.4 企业信息页
基本信息卡加一行「门锁 n 把」链接到门锁页(P2 顺手)。

## 6. 退租重分配流程(用户强调的细节)

锁生命周期状态机(派生,不落库):

```
空置(无 active 分配) ──分配给企业──> 使用中 ──退租清退/单锁回收──> 空置 ──> (新企业)使用中
```

清退动作语义(offboardCompanyLocks):
1. 该企业全部 active LockAssignment → revokedAt=now,reason=「企业退租清退」
2. 该企业相关密码全部 deletedAt(真实对接=远程 deleteType 2 批量删除;另注:换租户建议蓝牙到场重置密码,演示以"全部删除"体现)
3. 通行记录不动(companyId 快照保证新企业看不到)
4. toast 汇总 + 分配历史留痕
5. 新企业分配时,锁详情提示「上一家 XX 于 X 月退租,已清退 N 个密码」

## 7. Seed 设计(固定种子,锚点 2026-06-06)

- **锁 ≈75 把**:企业单元锁(partial 每占用楼层 1 把、上限 2;whole 2 把:一层大堂+办公区)≈55;楼栋大门 14;公共锁 6(A:强电井/消防控制室,B:配电房/水泵房,C:机房/仓库)
- **状态**:3-4 把离线(其中 1 把属故事企业③,讲降级)、3-5 把低电量、1 把省电模式(公共锁,讲 -3035)、其余在线信号 3
- **分配历史故事**:2 把锁带已回收记录(companyNameSnapshot「星辰视讯(已迁出)」,2025-12 退租清退 → 2026-01 分配现企业),企业档案直接讲换租链
- **密码 ≈25 个**:故事企业①③各 3-5 个(前台永久自定义、员工限期、**今天生效中的访客随机密码**、1 已禁用、1 已过期);物业发的保洁工作日循环码若干
- **通行记录 ≈2000 条**:近 30 天,故事锁每工作日 5-15 条;方式分布 passcode 60% / app_ble 25% / remote 10% / ic_card 5%;失败率 ~2%,其中 6/5 晚某锁连续 3 次失败(异常故事);6/6 当天有记录支撑「今日」KPI
- **客服管辖**:王琳=A、B 区全部锁;刘洋=C 区全部锁(与企业管辖对齐)

## 8. 演示脚本(验收线)

1. 主管 → 门锁管理:KPI/列表 → 远程开一把锁 → 通行记录 Tab 立刻多一条
2. 权限设置:C 区锁改配王琳 → 切王琳账号,门锁管理范围即时变化
3. 企业① 首页一键开门(成功动画)→ 生成访客密码 → 复制话术
4. 切物业端通行记录:看到企业①刚才的远程开锁(跨端联动)
5. 退租戏:企业档案③ → 门锁 Tab → 退租清退 → 切企业③账号门锁页变空 → 物业把空置锁分配给企业②(演新租户)→ 锁详情分配历史完整链

## 9. 实施拆分建议(一个 Sprint,S12)

1. types + id + statusMaps + lockSelectors + scope 扩展 + store 动作(含单测意义上的自洽)
2. seed:genLocks / genLockAssignments / genPasscodes / genUnlockRecords + 故事数据
3. 物业端:LocksPage(三 Tab)+ LockDetailDialog + 企业档案门锁 Tab + 权限设置扩展
4. 企业端:首页快捷开门卡 + CompanyLocksPage(三 Tab)+ 导航
5. smoke 验收 + README 更新
