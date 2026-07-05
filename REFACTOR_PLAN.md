# 产业园重构实施方案(REFACTOR_PLAN)

> 依据 `docs/task-brief.md`(任务书)与 `docs/client-requirements.md`(客户原始需求)制定,已获用户确认(2026-07-05)。
> 分阶段进度见 `PROGRESS.md`。

## 0. 已确认的口径决策

1. **企业①**:保持"每月 5 日对公转账",6-05 已缴清当月账单(模范人设);⚪️"未到付款日→暂不跟进"由背景企业(习惯 25/20 日)在收款跟进表演示。
2. **公共区域维修**:完工后**物业验收关单**(文案"待验收"),不走签字/评价;满意度仅来自企业报事报修。
3. **达成率**:期间目标只累计数据窗(2025-07 ~ 2026-06)内已有月份,2026 年视图 = 1~6 月,页面标注"统计至 2026-06"。
4. **日报原始条目**:改为"今日系统动态"——由当日 store 事件实时合成,保留"原始信息 → AI 提炼"叙事。
5. **临时停放收入为园区级账单**:`Bill.companyId` 可空(空 = 园区公共收入);物业角色可见、企业端不可见、不进楼栋收缴率表;视角应收 = 可见企业账单 +(仅物业角色)园区级账单。
6. **空间层级去掉 Unit 实体**:Park → Zone → Building;楼层/单元只是 `Company.occupancy` 描述字段;下钻终点 楼栋 → 企业。
7. **内控权限归属统一 `ownerUsername`**(admin/cs_wang/cs_liu);展示用执行人姓名另存。
8. **金额量级**:园区月应收 ≈ 180 万(物业费 18 元/㎡·月、企业 400~6000㎡);如需小体量整体减半费率,结构不变。
9. **⚪️ pending 双语义**:有习惯且当月付款日未到 → "暂不跟进";无习惯记录 → "待沟通核实"。
10. **企业端**沿用单列布局(放宽 `max-w-4xl`),导航 7 项;投诉并入"报事报修"页内 Tab(`/company/complaints/*` 路由保留)。

## 1. 新版 types 契约(src/data/types.ts)

- 角色:`Role = 'supervisor' | 'cs' | 'company'`;`Account { username, password, role, displayName, companyId? }`;`CurrentUser { role, username, displayName, companyId? }`;`CsAssignment { csUsername, companyIds }`(store 顶层,权限设置页改它)。
- 空间:`Park`('HM' 和美产业园)、`Zone`(A/B/C)、`Building`(zoneId, no, floors)。
- 企业:`Company { id 'C-xx', name, industry, zoneId, buildingId, occupancy, areaSqm, contactName, contactPhone, contractStart, contractEnd, paymentHabit? }`;`Occupancy = { type:'whole' } | { type:'partial', floors:number[], unitLabel }`;`PaymentHabit { payDay, method:'transfer'|'cheque'|'online', note? }`(可缺失 → ⚪️待沟通核实素材)。
- 账单:`FeeCategory = 'property'|'vehicle'|'utility'|'valueAdded'`;`VehicleSub = 'fixed'|'temporary'|'leased'`;`UtilitySub = 'water'|'electricity'`;`ValueAddedType = 'home_service'|'asset_ops'|'retail'`;`Bill { id(含 subType), companyId?, category, subType?, month, amount, paidAmount, paidAt?, contractId? }`;`Waiver { companyId, month, category, amount, reason }`(Bill.amount 为减免后应收,减免单独聚合);`RevenueTarget { category, month, amount }`;`ValueAddedContract { companyId, type, name, monthlyAmount, start, end }`。
- 工单:事件源沿用(8 种事件、6 种派生状态不变),加 `kind: 'company'|'public'`、`companyId?`、`location?`;public 单完工后派生仍是 `done_pending_sign`,文案层显示"待验收",验收 = append `CLOSED`(by 物业)。`Complaint` 结构不变(companyId 化)。
- 内控:`MaintenanceOrder { category:'fire'|'elevator'|'daily', title, location, plannedAt, executedAt?, completedAt?, note?, ownerUsername, executantName }`(状态派生 done/pending/overdue);`Inspection { areaLabel, templateKey, items[{itemKey,ok,note?}], photoCount, ownerUsername, inspectorName, plannedAt, executedAt? }`;`MeterReading { meterNo, type, location, month, prevValue, currValue, ownerUsername, readerName, readAt }`(24 个月);`WorkTask { level:'year'|'quarter'|'month'|'week', parentId?, title, ownerUsername, periodLabel, dueAt, status, completedAt? }`。
- 新增域:`Notice { type:'public_repair'|'water_outage'|'power_outage'|'general', title, content, scope(park|zone|building|companyIds), startAt, endAt, publishedBy, publishedAt, revokedAt?, relatedWorkOrderId? }`(状态派生:撤销>过期>生效中);`Invoice { companyId, month, category, amount, fileName, fileUrl?, uploadedBy, uploadedAt }`;`Survey { title, periodLabel, status, publishedBy, publishedAt }` + `SurveyResponse { surveyId, companyId, scores, comment?, submittedAt }`(题目走 SURVEY_QUESTIONS 制式配置);`FollowUpSuggestion = 'collect'|'hold'|'pending'` + `FollowUpRecord { companyId, createdAt, byUsername, arrearsAmountSnapshot, arrearsMonthsSnapshot, suggestionSnapshot, status:'active'|'resolved', resolvedAt? }`。
- 移除:Household/Resident/Unit、空置链路(isVacant/vacantSince/anomaly/ServiceTask/isHalfPrice)、DunningRecord。

**三色判定 `getFollowUpSuggestion`**(仅对欠费企业,实时派生):
1. 未闭环投诉 > 0 或 超时未完工工单 > 0 → `hold` 🟠;
2. 欠费仅当月:有习惯且付款日未到 → `pending` ⚪️(暂不跟进);无习惯记录 → `pending` ⚪️(待沟通核实);
3. 否则 → `collect` 🟢。
`getFollowUpReasons` 输出三依据并列(缴费习惯/报修关单/投诉关单);行内附历史减免。

## 2. 权限与 scope 层(全局唯一入口)

`src/data/selectors/scope.ts`:
- `visibleCompanyIds(state)`:supervisor → 全部;cs → csAssignments;company → 自己;
- `getScopedData(state)`:AppData 同形状视图,企业相关数组按可见企业过滤;园区级账单与 public 工单仅物业角色保留;
- `getScopedInternal(state)`:维保/巡检/核抄/任务按 ownerUsername 过滤(supervisor 全见,company 为空);
- `getNoticeScopeOptions(state)`:客服发通知可选范围(管辖企业及其所在区/楼栋)。

页面用 `src/hooks/useScopedData.ts`;**纪律:页面禁止直接读 `state.bills` 等原始数组,一律走 scoped**。纯 selector 风格 `(data, ...args)` 不变。

## 3. 路由与页面清单

**物业端 `/property`**(RequireRole ['supervisor','cs'] → PropertyLayout 分组侧边栏):
dashboard(驾驶舱)、daily-report(日报)、revenue/property(+ /:zoneId + /:zoneId/:buildingId 下钻,整栋独占直达企业详情)、revenue/vehicle、revenue/utility、revenue/value-added、service/work-orders(kind 筛选 + 投诉 Tab + 月度集成 + 生成通知)、service/maintenance、service/satisfaction(双来源 + 发起调研)、internal/inspections、internal/meters(同比/环比)、internal/tasks(年季月周穿透)、notices(`?new=1&fromWorkOrder=` 预填)、companies(3 Tab:企业列表/收款跟进/发票管理)+ companies/:companyId(详情 + 习惯编辑 + FollowUpReasonCard)、permissions(仅 supervisor)。

**企业端 `/company`**(RequireRole ['company'] → CompanyLayout 单列 max-w-4xl,7 项导航):
home(生效通知 + 本月账单概览 + 待办)、work-orders(+new/:id,页内 Tab 含投诉)、bills(四费类 + PayFlowDialog + FollowUpNoticeDialog)、invoices、survey、chat、profile(只读)。

登录页三组一键填入(主管/客服×2/企业×3);两 layout 头像菜单六账号互切。

## 4. Seed 编排

- **空间**:A 区 5 栋(A1/A2/A3/A5 整栋,A4 多户)、B 区 5 栋(B1/B3/B5 整栋,B2/B4 多户)、C 区 4 栋(C2/C3/C4 整栋,C1 多户)= 14 栋;企业 30 家(A9/B12/C9,整栋 10 家),行业混布,虚构名。
- **故事企业**:① `company1` 云脉智能科技(A3 整栋 ~5000㎡,payDay=5,全缴清,6 月 paidAt=06-05,满意度高);② `company2` 精工精密制造(B2 栋 3-4 层,历史减免 2 笔,当月欠物业费+电费 ≈2.6 万,超时报修 + 关联投诉 → 🟠,闭环后实时 🟢);③ `company3` 洄澜餐饮管理(C1 栋 1 层 101-104,payDay=28 支票,欠 5、6 月 ≈2.2 万 → 🟢,零售服务合同客户)。
- **背景欠费/待缴**:F1 晨科软件(A4,payDay=25,仅当月 → ⚪️暂不跟进)、F2 泰达仓储(B4,欠 5、6 月 → 🟢)、F3 拾光咖啡(C1,payDay=20,仅当月 → ⚪️)、F4 无习惯记录企业(仅当月 → ⚪️待沟通核实);其余全缴清。当月收缴率 ≈95%,历史月 98.5~100%。
- **客服分配**:cs_wang = A+B 21 家(含①②);cs_liu = C 9 家(含③)。三视角:应收 ≈180/122/55 万、收缴率错开 ≥1.5pp、当月工单 ≈14/10/5(verify:seed 断言)。
- **付款日分布**:多数 1~5;25/20/28 为 ⚪️🟢 素材;1 家 payDay=6(日报付款日提示);1~2 家 paidAt=2026-06-06 上午(今日收款);当天时间戳统一固定上午时刻。
- **账单**:12 月 × 四费类(物业 18 元/㎡·月;水电 0.1~3 万/月 夏季+15%;固定车位 300/个·月 + 租赁 500/个·月 + 临停园区级 2.5~3.5 万/月;增值合同 9 份)。Bill id 带 subType。
- **目标 k 系数**:物业 0.98~1.02 / 水电 1.02~1.06 / 车辆 1.05~1.10 / 增值 0.90~0.95 → 达成率 88%~108% 有层次。
- **工单** 12 个月 ≈120 单(企业 70%/公共 30%),RATED 铺满 12 个月,均分 4.4;当月新增 14、超时 2(故事② 1 + 公共 1);1 家 filler 3 条投诉(反复投诉旗)。
- **维保** ≈190 条(消防区/月、电梯多户楼栋/月、日常周),当月 1 条超期;**巡检**近 3 个月每日 2 条,异常 3 项;**核抄** 28 表 × 24 月(同比 +4~10%);**任务** 年 3 → 季 → 月 → 周(cs_liu ≥2 条周任务);**调研** 2025-12 / 2026-05 已结束各 30 份 + 2026-06 进行中(company1 未填);**发票** 2026-03~06 每企业每月至少 1 张(fileUrl 轮询 public/invoices/sample-1..3.pdf);**通知 6 条**(含生效中停电通知 scope=B 区)。
- 固定种子 `mulberry32(20260606)` 单实例顺序消费;演示固定 id C-01/C-02/C-03。

## 5. 旧模块处置清单

- **删除**:空置链路全部、催缴页(dunning/)、缴费钻取(payments/)、户档案页、HouseholdCell/VacantBadge/RiskList、storyHouseholds.ts、mock-content/dailyReports.ts、public/icons.svg。
- **改造**:work-orders/ 六文件、StatusStepper(kind 双步条)、PayFlowDialog、Signature/新建报修/投诉/AI 聊天(迁 pages/company/)、DunningNoticeDialog → FollowUpNoticeDialog、RequireRole、LoginPage、lib/id.ts、lib/statusMaps.ts。
- **重写**:types/constants/store(按域拆 store/actions-*.ts)、seed 四件、selectors 全部(新增 scope/revenue/followUp/maintenance/inspection/meter/task/notice/satisfaction/invoice/dailyReport)、mock-content 函数模板化、App.tsx、两 layout、驾驶舱、日报、README。
- **保留**:lib/{date,format,prng,utils}.ts、ui/*、use-mobile、全部构建配置、main.tsx、NotFoundPage。

## 6. 分阶段实施(每阶段:PROGRESS.md 更新 + git commit;S3 起 verify 保持绿)

S0 工作区与文档 → S1 契约与工具(types/constants/statusMaps/id/period/配置骨架)→ S2 seed 全量 + verify:seed 第一版 → S3 selectors + store + verify 两脚本绿 → S4 骨架(路由/守卫/两 layout/登录页,原子删旧页,tsc 首绿)→ S5 驾驶舱+日报 → S6 经营四页 → S7 服务品质三页 → S8 内控三页 → S9 通知+企业档案+权限设置+示例 PDF → S10 企业端全部页面 → S11 收尾(smoke/README/lint/build/验收清单)。

## 7. verify / smoke 断言要点

- **verify:seed**(硬断言):实体规模;三视角 KPI(admin 应收 = cs_wang + cs_liu + 园区级;收缴率互异 ≥1.5pp);楼栋表 Σ+园区级 = KPI、区小计、A3 收缴率 = 企业①;四费类月视图 Σ = 驾驶舱本月实收;三色摆位;减免 KPI = Σwaivers;今日收款;满意度双来源一致;核抄 24 月与同比带;任务可追溯与达成率派生;发票 fileUrl 存在;停电通知 relevant 判定;权限隔离(cs_liu 不含①②、cs_wang 不含③、company1 仅自己、company 内控为空)。
- **verify:flows**:①报修闭环+满意度联动;②企业② hold→闭环→collect;③startFollowUp→弹窗依据→缴费→auto-resolve+收缴率升;④B 区停电通知 relevant/撤销/客服范围校验;⑤发票上传→company2 可见 company1 不可见;⑥企业③改配→两客服数字变化;⑦调研提交→聚合更新;⑧周任务完成→达成率变化;⑨聊天含费率;⑩付款日提示。
- **smoke**(Playwright 单会话不刷新):admin 全页遍历(下钻/弹窗/发起调研/新建通知/权限改配)→ 切 cs_wang(数字变化)→ 切 cs_liu(任务只见自己)→ 切 company2(停电通知/签字流/发票/调研),截图 25+ 张。

## 8. 实施坑位对照表

1. `payBills` 保留"欠费清零 → active FollowUpRecord 自动 resolved"联动。
2. `seenDunningIds` → `seenFollowUpIds`,每次登录只弹一次。
3. DetailDialogHost 扩前缀;setTab 记得 `delete('detail')`。
4. BillingHistory 双端共用,四费类键同步;企业端 scoped 纪律。
5. Bill id 必须带 subType。
6. `noUnusedLocals`:占位页零 import;`verbatimModuleSyntax`:type import 分离。
7. 趋势图只标实收序列,完整数字进明细小表;工单状态分布用横向条形图。
8. 当天时间戳固定上午时刻;verify 断言不依赖真实时钟。
9. LoginPage Tab 改"端"维度。
10. store 按域拆文件。
11. mock-content 全函数模板,禁止静态硬对齐数字。
12. 客服发通知范围必须走 getNoticeScopeOptions。
13. smoke 全程同标签页不刷新。
