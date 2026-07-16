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
    amount: 65000,
  },
  {
    no: 5,
    name: '员工端(小程序)',
    desc: '水表 / 电表拍照录入(照片留证 + 读数填报)、巡检任务打卡(检查项清单、拍照、异常上报)',
    amount: 30000,
  },
  {
    no: 6,
    name: '智能门锁 · 平台对接',
    desc: '通通锁(TTLock)开放平台云 API 对接:访问令牌管理(90 天自动刷新)、远程开锁 / 闭锁、随机与自定义密码远程下发 / 修改 / 禁用 / 删除、设备状态查询(在线 / 电量 / 信号)、通行记录回调接收(准实时);锁-房源-企业分配模型、企业退租一键清退(回收门锁 + 批量删除密码 + 记录归档)、客服门锁管辖权限、开门操作审计日志',
    amount: 35000,
  },
  {
    no: 7,
    name: '智能门锁 · 两端功能',
    desc: '物业 Web 端:设备总览(在线率 / 低电量 / 异常监控)、密码管理、通行记录查询、锁详情与分配历史、企业档案门锁台账、客服门锁权限设置;企业端小程序:首页一键开门、员工 / 访客密码自助管理(含访客邀请话术)、本企业通行记录',
    amount: 30000,
  },
  {
    no: 8,
    name: '门锁现场实施与调试',
    desc: '测试环境搭建与测试锁真机联调(开发期);正式锁逐把蓝牙绑定与 WiFi 配网(需在锁旁现场操作)、与园区网络环境调试、试运行陪跑',
    amount: 20000,
  },
  {
    no: 9,
    name: 'AI 能力',
    desc: '驾驶舱智能摘要、日报智能提炼、企业端 AI 客服问答(接入国产合规大模型)',
    amount: 25000,
  },
  {
    no: 10,
    name: '部署与安全',
    desc: '云环境搭建、HTTPS 证书、监控告警、数据自动备份、正式上线切换',
    amount: 20000,
  },
  {
    no: 11,
    name: '测试与交付',
    desc: '系统测试、验收支持、操作手册、使用培训',
    amount: 20000,
  },
]

const TOTAL = QUOTE_ITEMS.reduce((s, x) => s + x.amount, 0)

const MILESTONES = [
  { node: '首款:合同签订后 5 个工作日内', ratio: '30%', amount: 129000 },
  { node: '交付:系统开发完成交付(含门锁测试锁真机联调)', ratio: '30%', amount: 129000 },
  { node: '验收:系统上线后 1 个月并通过验收(含门锁现场调试完成)', ratio: '30%', amount: 129000 },
  { node: '尾款:系统上线后 6 个月', ratio: '10%', amount: 43000 },
]

const PHASES = [
  {
    name: '设计确认',
    desc: '需求规格、原型与数据 / 接口设计评审;同步启动域名备案、小程序注册认证、微信商户号申请、通通锁开放平台开发者账号与应用申请(人工审核)、测试锁采购(外部流程与开发并行)',
    weeks: '第 1–2 周',
  },
  {
    name: '开发与联调',
    desc: '后端平台、Web 管理端、两类小程序、智能门锁模块开发与三端联调;门锁功能先以测试锁在实验室完成全接口真机联调',
    weeks: '第 3–15 周',
  },
  {
    name: '上线与验收',
    desc: '云端部署、期初数据导入、门锁现场绑定与 WiFi 配网调试(逐把,需在锁旁操作)、试运行(UAT)、培训、正式上线',
    weeks: '第 16–18 周',
  },
]

const PARTS = [
  { part: '物业管理端', user: '物业主管、客服人员', form: 'Web 网页(电脑端+手机适配)' },
  { part: '企业端', user: '入驻企业', form: 'Web 网页(电脑端+手机适配),微信小程序' },
  { part: '员工端', user: '一线工作人员(抄表、巡检)', form: '微信小程序' },
  { part: '智能门锁对接', user: '物业(管理)、入驻企业(开门)', form: '通通锁 TTLock 开放平台云对接(WiFi 版,免网关;门锁硬件由甲方采购)' },
  { part: '后端平台', user: '—', form: '云端部署(阿里云 / 腾讯云)' },
]

const OBLIGATIONS = [
  '提供企业主体资质,用于域名 ICP 备案、微信小程序注册认证与微信支付商户号开通(乙方协办全部流程);',
  '以甲方名义注册通通锁(TTLock)开放平台开发者账号并创建应用(乙方协办),提供园区门锁专用主账号手机号;',
  '门锁设备的采购与安装由甲方负责;为开发测试提供 2–3 把同型号测试锁(可从已采购批次中调拨,不足另购);现场调试期间安排物业人员陪同,并保障锁安装位置的园区 WiFi 网络覆盖;',
  '设计阶段一次性提供制式表单模板(巡检项清单、满意度调研问卷)与各项收费标准口径;',
  '按乙方提供的 Excel 模板整理企业档案与期初账单数据,由乙方负责导入;',
  '指定项目对接人,按里程碑及时组织确认与验收。',
]

const EXCLUSIONS = [
  '电子发票平台自动开票对接(本期发票功能为人工上传 PDF 文件、企业端查询下载);',
  '信息安全等级保护(等保)测评与整改;',
  '招商租赁、合同管理等新业务模块;',
  'iOS / Android 原生 App;手机蓝牙开锁使用厂商官方「科技侠」APP,自有 APP 集成蓝牙 SDK 不在本期范围;',
  '门锁 IC 卡 / 指纹 / 人脸凭证管理(本期以键盘密码 + 远程开锁为主,如需可另行评估);',
  '通通锁本地化(私有化)部署对接。',
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
          <div className="text-slate-500">Web 管理端 + 微信小程序(企业端 / 员工端)+ 智能门锁对接 + 后端平台与云端部署</div>
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-1 text-xs text-slate-500">
            <span>
              报价编号:<b className="font-semibold text-slate-900">HM-BJ-20260715-02</b>
            </span>
            <span>
              报价日期:<b className="font-semibold text-slate-900">2026 年 7 月 15 日</b>
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
          在甲方已确认的演示系统(和美产业园版)基础上进行正式系统建设,覆盖园区经营管理、服务品质、内控管理全业务流程,并按甲方要求新增一线员工移动录入、企业端微信小程序与智能门锁(通通锁
          TTLock,WiFi 版)对接。系统由以下五部分组成:
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
          总体工期:合同生效后 16–18 周(约 4–4.5
          个月),已包含小程序与门锁对接工作量。备案、小程序审核与通通锁开放平台应用审核为官方流程,时间以官方为准,已在计划中预留;门锁现场调试的具体日期由双方按锁安装进度共同商定。
        </p>

        <SectionTitle>五、质保与运维</SectionTitle>
        <ul className="list-disc pl-6">
          <li>
            <b>免费质保</b>:系统上线后 6 个月,涵盖缺陷修复与故障响应。
          </li>
          <li>
            <b>年度服务费</b>(¥65,000 /
            年):系统监控值守(含门锁云对接与通行记录回调服务)、数据备份巡检、安全补丁更新、故障响应、小功能迭代(不含新业务模块开发),响应时效于运维协议中约定;<b>并已包含第三方费用</b>——云服务器等云资源额度
            ¥10,000 / 年、大模型 API(token)额度 ¥5,000 / 年、微信小程序认证费等,超出额度部分按实结算。
          </li>
          <li className="text-xs text-slate-500">
            说明:微信支付通道手续费(0.6%)由微信官方在交易中直接扣收,不含在本报价内;门锁硬件(含测试锁)由甲方采购,硬件故障由锁具厂商 / 经销商按其质保政策处理。
          </li>
        </ul>

        <SectionTitle>六、甲方配合事项</SectionTitle>
        <ol className="list-decimal pl-6">
          {OBLIGATIONS.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ol>

        <SectionTitle>七、除外事项与需求变更</SectionTitle>
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
