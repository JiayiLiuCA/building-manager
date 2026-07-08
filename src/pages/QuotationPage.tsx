// ============================================================
// 项目报价单(隐藏路由 /quotation,不进任何导航;直接输入 URL 访问)
// 面向客户的正式商务文档:固定明色印刷风,不随暗色主题变化。
// 独立 HTML 版见 docs/quotation.html —— 修改报价时两处需同步。
// ============================================================

const QUOTE_ITEMS = [
  {
    no: 1,
    name: '系统设计',
    desc: '需求规格书、交互原型、数据库与接口设计、制式表单(巡检项 / 调研问卷)确认',
    amount: 20000,
  },
  {
    no: 2,
    name: '后端平台',
    desc: '账号与权限体系(主管 / 客服 / 企业 / 员工四类角色)、四费类账单与目标管理引擎、工单与投诉流程、维保 / 巡检 / 核抄 / 任务管理、通知 / 发票 / 满意度调研、经营统计分析引擎、微信支付对接',
    amount: 120000,
  },
  {
    no: 3,
    name: '物业管理端(Web)',
    desc: '驾驶舱、日报、经营管理(物业 / 车辆 / 水电 / 增值四模块)、服务品质(维修 / 维保 / 满意度)、内控管理(巡检 / 核抄 / 任务)、通知管理、企业档案与收款跟进、权限设置',
    amount: 45000,
  },
  {
    no: 4,
    name: '企业端小程序',
    desc: '微信授权登录与企业绑定、园区通知、报事报修与投诉全流程(拍照、电子签字、评价)、账单查询与在线缴费、发票查询下载、满意度调研填写、企业信息',
    amount: 70000,
  },
  {
    no: 5,
    name: '员工端(小程序)',
    desc: '水表 / 电表拍照录入(照片留证 + 读数填报)、巡检任务打卡(检查项清单、拍照、异常上报)',
    amount: 30000,
  },
  {
    no: 6,
    name: 'AI 能力',
    desc: '驾驶舱智能摘要、日报智能提炼、企业端 AI 客服问答(接入国产合规大模型)',
    amount: 25000,
  },
  {
    no: 7,
    name: '部署与安全',
    desc: '云环境搭建、HTTPS 证书、监控告警、数据自动备份、正式上线切换',
    amount: 20000,
  },
  {
    no: 8,
    name: '测试与交付',
    desc: '系统测试、验收支持、操作手册、使用培训',
    amount: 20000,
  },
]

const TOTAL = QUOTE_ITEMS.reduce((s, x) => s + x.amount, 0)

const MILESTONES = [
  { node: '合同签订后 5 个工作日内', ratio: '30%', amount: 105000 },
  { node: '核心功能联调演示通过', ratio: '30%', amount: 105000 },
  { node: '系统上线并通过验收', ratio: '30%', amount: 105000 },
  { node: '质保期满(上线后 6 个月)', ratio: '10%', amount: 35000 },
]

const PHASES = [
  {
    name: '设计确认',
    desc: '需求规格、原型与数据 / 接口设计评审;同步启动域名备案、小程序注册认证、微信商户号申请(外部流程与开发并行)',
    weeks: '第 1–2 周',
  },
  { name: '开发与联调', desc: '后端平台、Web 管理端、两类小程序开发与三端联调', weeks: '第 3–12 周' },
  { name: '上线与验收', desc: '云端部署、期初数据导入、试运行(UAT)、培训、正式上线', weeks: '第 13–15 周' },
]

const THIRD_PARTY = [
  { name: '云资源', desc: '云服务器、数据库、对象存储、短信等(阿里云或腾讯云,以甲方名义开通)', est: '约 ¥8,000–12,000 / 年' },
  { name: '大模型 API', desc: 'AI 摘要 / 日报 / 客服问答,按调用量计费', est: '预计 < ¥2,000 / 年' },
  { name: '微信支付手续费', desc: '微信官方按交易金额收取', est: '0.6%' },
  { name: '小程序认证费', desc: '微信官方年审费用', est: '¥300 / 年' },
]

const PARTS = [
  { part: '物业管理端', user: '物业主管、客服人员', form: 'Web 网页(电脑端)' },
  { part: '企业端', user: '入驻企业', form: '微信小程序' },
  { part: '员工端', user: '一线工作人员(抄表、巡检)', form: '微信小程序' },
  { part: '后端平台', user: '—', form: '云端部署(阿里云 / 腾讯云)' },
]

const OBLIGATIONS = [
  '提供企业主体资质,用于域名 ICP 备案、微信小程序注册认证与微信支付商户号开通(乙方协办全部流程);',
  '设计阶段一次性提供制式表单模板(巡检项清单、满意度调研问卷)与各项收费标准口径;',
  '按乙方提供的 Excel 模板整理企业档案与期初账单数据,由乙方负责导入;',
  '指定项目对接人,按里程碑及时组织确认与验收。',
]

const EXCLUSIONS = [
  '电子发票平台自动开票对接(本期发票功能为人工上传 PDF 文件、企业端查询下载);',
  '信息安全等级保护(等保)测评与整改;',
  '招商租赁、合同管理等新业务模块;',
  'iOS / Android 原生 App。',
]

const yuan = (n: number) => n.toLocaleString('zh-CN')

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 mb-2.5 border-l-4 border-blue-900 pl-2.5 text-[15px] font-bold">{children}</h2>
}

const th = 'border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-left font-semibold'
const td = 'border border-slate-200 px-2.5 py-1.5 align-top'

export function QuotationPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-8 text-[13px] leading-relaxed text-slate-900 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px] bg-white px-8 py-10 shadow-md sm:px-14 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* 页眉 */}
        <header className="border-b-[3px] border-blue-900 pb-4">
          <div className="text-xs font-semibold tracking-[0.35em] text-blue-900">项目报价单 · QUOTATION</div>
          <h1 className="mt-1.5 text-[22px] font-bold">和美产业园智慧物业管理系统建设项目</h1>
          <div className="text-slate-500">Web 管理端 + 微信小程序(企业端 / 员工端)+ 后端平台与云端部署</div>
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-1 text-xs text-slate-500">
            <span>
              报价编号:<b className="font-semibold text-slate-900">HM-BJ-20260708-01</b>
            </span>
            <span>
              报价日期:<b className="font-semibold text-slate-900">2026 年 7 月 8 日</b>
            </span>
            <span>
              有效期:<b className="font-semibold text-slate-900">自报价日起 30 天</b>
            </span>
          </div>
        </header>

        {/* 甲乙双方 */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <div className="flex-1 rounded border border-slate-200 px-3 py-2">
            <div className="text-[11px] text-slate-500">甲方(客户)</div>
            ____________________(物业公司全称)
          </div>
          <div className="flex-1 rounded border border-slate-200 px-3 py-2">
            <div className="text-[11px] text-slate-500">乙方(承建方)</div>
            ____________________(乙方公司全称)
          </div>
        </div>

        <SectionTitle>一、项目概述</SectionTitle>
        <p>
          在甲方已确认的演示系统(和美产业园版)基础上进行正式系统建设,覆盖园区经营管理、服务品质、内控管理全业务流程,并按甲方要求新增一线员工移动录入与企业端微信小程序。系统由以下四部分组成:
        </p>
        <table className="mt-2 w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className={`${th} w-[22%]`}>组成部分</th>
              <th className={`${th} w-[30%]`}>使用者</th>
              <th className={th}>形态</th>
            </tr>
          </thead>
          <tbody>
            {PARTS.map((r) => (
              <tr key={r.part}>
                <td className={td}>{r.part}</td>
                <td className={td}>{r.user}</td>
                <td className={td}>{r.form}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionTitle>二、报价明细</SectionTitle>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className={`${th} w-[6%] text-center`}>序号</th>
              <th className={`${th} w-[20%]`}>分项</th>
              <th className={th}>交付内容</th>
              <th className={`${th} w-[14%] text-right`}>金额(元)</th>
            </tr>
          </thead>
          <tbody>
            {QUOTE_ITEMS.map((it) => (
              <tr key={it.no}>
                <td className={`${td} text-center`}>{it.no}</td>
                <td className={td}>{it.name}</td>
                <td className={td}>{it.desc}</td>
                <td className={`${td} text-right tabular-nums whitespace-nowrap`}>{yuan(it.amount)}</td>
              </tr>
            ))}
            <tr className="bg-blue-50/40 font-bold">
              <td className={td} colSpan={3}>
                合计(人民币含税总价,发票类型与税率由双方合同约定)
              </td>
              <td className={`${td} text-right tabular-nums whitespace-nowrap`}>¥{yuan(TOTAL)}</td>
            </tr>
          </tbody>
        </table>

        <SectionTitle>三、付款方式</SectionTitle>
        <table className="w-full border-collapse text-[12.5px] sm:w-3/4">
          <thead>
            <tr>
              <th className={th}>付款节点</th>
              <th className={`${th} w-[15%] text-center`}>比例</th>
              <th className={`${th} w-[22%] text-right`}>金额(元)</th>
            </tr>
          </thead>
          <tbody>
            {MILESTONES.map((m) => (
              <tr key={m.node}>
                <td className={td}>{m.node}</td>
                <td className={`${td} text-center`}>{m.ratio}</td>
                <td className={`${td} text-right tabular-nums`}>{yuan(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionTitle>四、工期计划</SectionTitle>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className={`${th} w-[18%]`}>阶段</th>
              <th className={th}>内容</th>
              <th className={`${th} w-[16%]`}>周期</th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((p) => (
              <tr key={p.name}>
                <td className={td}>{p.name}</td>
                <td className={td}>{p.desc}</td>
                <td className={td}>{p.weeks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-xs text-slate-500">
          总体工期:合同生效后约 3.5–4 个月。备案与小程序审核为微信 / 工信部官方流程,时间以官方为准,已在计划中预留。
        </p>

        <SectionTitle>五、质保与运维</SectionTitle>
        <ul className="list-disc pl-6">
          <li>
            <b>免费质保</b>:系统上线后 6 个月,涵盖缺陷修复与故障响应。
          </li>
          <li>
            <b>年度运维</b>(次年起,¥40,000 /
            年):系统监控值守、数据备份巡检、安全补丁更新、故障响应、小功能迭代(不含新业务模块开发);响应时效于运维协议中约定。
          </li>
        </ul>

        <SectionTitle>六、第三方费用(实际发生,由甲方承担)</SectionTitle>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className={`${th} w-[22%]`}>项目</th>
              <th className={th}>说明</th>
              <th className={`${th} w-[24%]`}>预估</th>
            </tr>
          </thead>
          <tbody>
            {THIRD_PARTY.map((t) => (
              <tr key={t.name}>
                <td className={td}>{t.name}</td>
                <td className={td}>{t.desc}</td>
                <td className={td}>{t.est}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionTitle>七、甲方配合事项</SectionTitle>
        <ol className="list-decimal pl-6">
          {OBLIGATIONS.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ol>

        <SectionTitle>八、除外事项与需求变更</SectionTitle>
        <p>以下内容不在本次报价范围内,如有需要可另行评估报价:</p>
        <ol className="list-decimal pl-6">
          {EXCLUSIONS.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <p className="mt-1.5 text-xs text-slate-500">
          需求变更:设计确认后新增或调整的需求,双方按变更流程另行评估工期与费用影响。
        </p>

        {/* 签章区 */}
        <div className="mt-9 flex gap-10 break-inside-avoid">
          <div className="flex-1">
            <div className="h-14 border-b border-slate-900" />
            <div className="mt-1.5 text-xs text-slate-500">甲方(盖章)  日期:</div>
          </div>
          <div className="flex-1">
            <div className="h-14 border-b border-slate-900" />
            <div className="mt-1.5 text-xs text-slate-500">乙方(盖章)  日期:</div>
          </div>
        </div>

        <footer className="mt-7 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
          本报价单一式两份,甲乙双方各执一份;最终合作内容以双方签署的正式合同为准。
        </footer>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="fixed right-6 bottom-6 rounded-lg bg-blue-900 px-4 py-2.5 text-sm text-white shadow-lg hover:opacity-90 print:hidden"
      >
        打印 / 另存为 PDF
      </button>
    </div>
  )
}
