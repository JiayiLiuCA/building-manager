# 重构进度(PROGRESS)

> 方案见 `REFACTOR_PLAN.md`;任务书见 `docs/task-brief.md`。每阶段完成后更新本文件并提交。

## 全局纪律

- 页面**禁止直接读 `state.bills` 等原始数组**,企业相关数据一律经 `getScopedData` / `getScopedInternal`(scope.ts 唯一入口)。
- 图表数值必须常显(LabelList/label)并配明细小表,不允许 hover-only。
- mock-content 只允许函数模板(吃派生数字),禁止与 seed 硬对齐的静态数字。
- S3 起每阶段结束 `npm run verify:seed`、`npm run verify:flows` 必须绿;S4 起 `tsc -b` 绿。

## 阶段状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| S0 | 工作区与文档(克隆/依赖/REFACTOR_PLAN/需求入库/PROGRESS) | ✅ 完成 |
| S1 | 契约与工具层(types/constants/statusMaps/id/period/seed 配置骨架) | ✅ 完成 |
| S2 | seed 全量重写 + verify:seed 第一版 | ✅ 完成 |
| S3 | selectors + store 重写,verify 两脚本绿 | ⬜ |
| S4 | 骨架(路由/守卫/两 layout/登录页),tsc 首绿 | ⬜ |
| S5 | 驾驶舱 + 日报 | ⬜ |
| S6 | 经营管理四页(含下钻) | ⬜ |
| S7 | 服务品质三页 | ⬜ |
| S8 | 内控管理三页 | ⬜ |
| S9 | 通知管理 + 企业档案 + 权限设置 | ⬜ |
| S10 | 企业端全部页面 | ⬜ |
| S11 | 收尾(smoke/README/lint/build/验收清单) | ⬜ |

## 阶段记录

### S2(2026-07-05)

- seed 全量重写:30 家企业(整栋 10)、账单 ≈2500 张(12 月四费类,减免记净额,临停为园区级)、目标 48 条、工单 100(企业/公共两类,RATED 铺满 12 个月)、投诉 12、维保 137、巡检 180(异常 3 项)、核抄 672(24 个月,同比 +6.1%)、任务 36(年→季→月→周)、调研 3 期(第三期进行中且故事①未填)、发票 120、通知 6(含生效中 B 区停电)、跟进历史 1。
- 关键口径落位:当月收缴率 admin 92.7% / 王琳 93.5% / 刘洋 90.6%(全部 >90 不触发告警且肉眼可辨);超时未完工恰 2 单(②空调+公共照明);故事③欠 5、6 两月;C-18 历史挂账 4、5 月;⚪️素材=C-05(25 日)/C-29(20 日)/C-21(无习惯)。
- `verify:seed` 重写为 65 条硬断言并全绿(process.exit 语义)。

### S1(2026-07-05)

- `types.ts` 全量重写:Role 三值、Company/Occupancy/PaymentHabit、四费类 Bill(companyId 可空=园区级)、Waiver/RevenueTarget/ValueAddedContract、工单加 kind、维保/巡检/核抄/任务(ownerUsername 权限归属)、通知/发票/调研/收款跟进;AppData 22 个切片。
- `data/constants.ts`:费率 18 元/㎡·月、车位 300/500、SLA 48h、响应 4h、维保容差 24h。
- `lib/statusMaps.ts` 重写(新增 getWoStatusMeta 按 kind 区分「待验收」);`lib/id.ts` 新前缀(FU/NT/IV/SR);新增 `lib/period.ts`(年/季/月期间口径唯一源,达成率只累计已有月份)。
- `seed/constants.ts`:园区 3 区 14 栋、30 家企业显式定义(占位/面积/习惯/欠费画像)、6 账号、10 员工、增值合同 9 份、巡检模板/调研问卷制式配置、园区语境文案池、年度任务树配置、目标 k 系数。
- 新契约层独立 tsc --strict 通过(全量 tsc 绿在 S4)。

### S0(2026-07-05)

- 克隆 building-manager 仓库到工作目录,`npm install` 完成,旧 `verify:seed` 冒烟通过(tsx 工具链正常)。
- 入库文档:`REFACTOR_PLAN.md`(已确认方案)、`docs/task-brief.md`(任务书全文)、`docs/client-requirements.md`(客户原始需求)、本文件。
