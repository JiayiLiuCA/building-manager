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
| S1 | 契约与工具层(types/constants/statusMaps/id/period/seed 配置骨架) | ⬜ |
| S2 | seed 全量重写 + verify:seed 第一版 | ⬜ |
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

### S0(2026-07-05)

- 克隆 building-manager 仓库到工作目录,`npm install` 完成,旧 `verify:seed` 冒烟通过(tsx 工具链正常)。
- 入库文档:`REFACTOR_PLAN.md`(已确认方案)、`docs/task-brief.md`(任务书全文)、`docs/client-requirements.md`(客户原始需求)、本文件。
