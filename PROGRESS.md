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
| S3 | selectors + store 重写,verify 两脚本绿 | ✅ 完成 |
| S4 | 骨架(路由/守卫/两 layout/登录页),tsc 首绿 | ✅ 完成 |
| S5 | 驾驶舱 + 日报 | ✅ 完成 |
| S6 | 经营管理四页(含下钻) | ✅ 完成 |
| S7 | 服务品质三页 | ✅ 完成 |
| S8 | 内控管理三页 | ✅ 完成 |
| S9 | 通知管理 + 企业档案 + 权限设置 | ✅ 完成 |
| S10 | 企业端全部页面 | ✅ 完成 |
| S11 | 收尾(smoke/README/lint/build/验收清单) | ✅ 完成 |

## 验收清单核对(任务书 §11,2026-07-06)

- [x] 6 个账号登录后视角、导航、数据范围全部正确;企业端看不到任何内控数据或其他企业数据(verify:seed 隔离断言 + smoke)。
- [x] 主管在权限设置页把企业③改配给王琳后,两位客服的驾驶舱、日报、各列表立即变化(verify:flows 链路 6 + smoke 断言 21→22 / 9→8)。
- [x] 主管与两位客服的驾驶舱、日报数字分别等于各自可见企业数据的聚合(verify:seed:admin 应收 = 王琳 + 刘洋 + 园区级;日报口径断言)。
- [x] 驾驶舱:KPI 含费用减免(金额 + 占应收比);欠费为次要紧凑折叠卡;四张图全部常显数值并配明细(趋势图改柱线复合保证标签可靠);按区分组的楼栋收缴率表(区小计 + 总计)与客服个人收缴率表(合计行);收款跟进逐企业三依据 + 历史减免。
- [x] 经营管理四页均有年/季/月切换、目标与达成率、带数值趋势图与明细表;物业服务收费下钻 园区→区→楼栋→企业。
- [x] 整栋独占与多户楼栋两种形态在楼栋收缴率(A3=企业①断言)、收费下钻(整栋直达)、通知范围、企业档案中正确呈现。
- [x] 服务品质:维修工单两类型、维保三类型的及时性/关单率与月度集成分析;满意度双来源与月度整体数据。
- [x] 内控管理三页:巡检质量与时效、核抄用量同比/环比(24 个月)、任务年/季/月/周穿透与达成率;客服仅见自己的任务/记录(smoke 断言刘洋不可见主管任务)。
- [x] 通知发布→企业首页、缴费习惯记录→前置判断引用、发票上传→企业端查询下载,三条新链路完整可演示(verify:flows 链路 4/5 + smoke)。
- [x] `verify:seed`(95 条硬断言)、`verify:flows`(10 条链路)、`smoke`(46 项断言 + 40 张截图)全部通过;README 与 `docs/client-requirements.md` 就位。
- [x] `tsc -b`、`eslint`、`vite build` 全绿。

## 阶段记录

### S9~S11(2026-07-05 ~ 07-06)

- S9:通知管理(发布/撤销/客服范围受限/公共维修工单一键预填)、企业档案三 Tab(列表/收款跟进完整版/发票管理)、企业详情(缴费习惯编辑即时生效 + 前置判断卡 + 五 Tab)、权限设置(按区勾选、互斥归属、保存即生效);public/invoices 三个示例 PDF(自算 xref 的最小合法 PDF)。
- S10:企业端 11 页 + 弹窗(首页通知醒目区/待办、报事报修含投诉、四费类 BillingHistory、PayFlowDialog、发票查询下载、调研在线填写、AI 咨询、企业信息只读);FollowUpNoticeDialog 弱化为「缴费提醒」并完全 store 派生(修复三处 set-state-in-effect:内层组件随开挂载 + 懒初始化 + 派生 open)。
- S11:smoke.ts 重写(六账号同标签页遍历、46 项断言、40 张截图,含权限改配 21→22/9→8 与内控隔离断言);修复趋势图 Line 标签在 recharts v3 不渲染的问题(改柱线 ComposedChart);README 重写;`tsc/eslint/verify:seed/verify:flows/smoke/build` 全绿。

### S4~S8(2026-07-05)

- S4:双端骨架(RequireRole roles 数组/roleHome、PropertyLayout 四分组 15 项导航+角色过滤+六账号互切、CompanyLayout 7 项导航、登录页三组账号、全量路由+占位页);原子删除旧页面;`tsc -b` 首绿;eslint 对 shadcn 生成文件加豁免。
- S5:驾驶舱(6 KPI 含减免/欠费紧凑折叠卡/四图 LabelList+明细表/楼栋收缴率表区小计总计/客服收缴率表/收款跟进 Top 三依据/AI 摘要模板)+ 日报(实时生成+今日系统动态+付款日提示)。
- S6:经营四页(PeriodSwitcher 年/季/月 URL 化、达成率 KPI、物业收费园区→区→楼栋→企业下钻且整栋直达、车辆三口径/水电两口径/增值合同)。
- S7:维修工单双类型+投诉 Tab+月度集成分析、公共单验收关单+一键生成通知、维保三类计划 vs 实际、满意度双来源+发起调研;DetailDialogHost 恢复。
- S8:巡检(checklist 弹窗/完成率及时率异常)、核抄(同比/环比显性)、任务四级穿透+标记完成。
- 阶段性 mini-smoke:12 个物业端页面真浏览器遍历零运行时错误(同会话点导航,不整页刷新)。

### S3(2026-07-05)

- `selectors/scope.ts` 权限唯一入口;**口径决策:园区级临停账单仅主管可见**(保证"客服每个财务数字=名下企业聚合"的可加性),公共工单物业两角色可见、企业端不可见。
- 12 个 selector 域全部重写/新增;store 重写为 6 账号会话 + 32 动作(未按域拆文件:动作体量 ~700 行可控,保持单文件便于检索)。
- chatRules 园区语境重写(store 依赖,提前于 S10)。
- `verify:seed` 扩至 94 条断言(三视角一致性/楼栋表口径/四费类=驾驶舱实收/三色摆位/权限隔离/日报口径);`verify:flows` 重写为 10 条链路,全绿。

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
