// UI 冒烟:Playwright 真浏览器遍历两端全部页面并截图(需 dev server 运行中:npm run dev)
// 运行:npx tsx scripts/smoke.ts
// 注意:内存 store 刷新即重置,全程单标签页点击导航,不做整页刷新。
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:5173'
const SHOTS = 'scripts/shots'
let failures = 0
const errors: string[] = []

function check(name: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) failures += 1
}

async function expectText(page: Page, text: string | RegExp, name: string) {
  const ok = await page
    .getByText(text)
    .first()
    .isVisible()
    .catch(() => false)
  check(name, ok)
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

async function nav(page: Page, label: string) {
  await page.getByRole('link', { name: label, exact: true }).first().click()
  await page.waitForTimeout(700)
}

async function switchAccount(page: Page, menuLabel: string, urlPart: string) {
  await page.locator('header').getByRole('button').last().click()
  await page.getByRole('menuitem', { name: new RegExp(menuLabel) }).click()
  await page.waitForURL(`**${urlPart}**`)
  await page.waitForTimeout(900)
}

async function main() {
  mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ channel: 'chromium' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`)
  })

  // ===== 登录页 =====
  await page.goto(`${BASE}/login`)
  await expectText(page, '和美物业 AI OS', '登录页标题')
  await expectText(page, '演示账号', '登录页演示账号区')
  await shot(page, '00-login')
  await page.getByText('主管 陈志远').click()
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL('**/property/dashboard')
  await page.waitForTimeout(1300)

  // ===== 主管:驾驶舱 =====
  await expectText(page, '本月应收', '驾驶舱 KPI')
  await expectText(page, '费用减免(本月)', '驾驶舱减免 KPI')
  await expectText(page, '按楼栋收缴率', '楼栋收缴率表')
  await expectText(page, '客服个人收缴率', '客服收缴率表')
  await expectText(page, '收款跟进 · 前置判断', '收款跟进板块')
  await shot(page, '10-dashboard-admin')

  // 欠费紧凑卡展开
  await page.getByText('欠费数据(历史 + 当期)').click()
  await page.waitForTimeout(400)
  await expectText(page, '欠费金额', '欠费明细展开')
  await shot(page, '11-arrears-expand')

  // ===== 日报 =====
  await nav(page, '日报')
  await expectText(page, '今日收款与收缴率', '日报收款块')
  await expectText(page, '习惯付款日提示', '日报付款日提示')
  await expectText(page, '今日系统动态', '日报动态条目')
  await shot(page, '12-daily-report')

  // ===== 经营管理四页(含下钻)=====
  await nav(page, '物业服务收费')
  await expectText(page, '达成率', '物业收费达成率')
  await shot(page, '13-revenue-property')
  await page.getByRole('row', { name: /A 区/ }).first().click()
  await page.waitForTimeout(700)
  await expectText(page, 'A1 栋', '区级下钻楼栋行')
  await shot(page, '14-revenue-zone')
  await page.getByRole('row', { name: /A3 栋/ }).first().click()
  await page.waitForURL('**/property/companies/C-03**')
  await page.waitForTimeout(800)
  await expectText(page, '云脉智能科技', '整栋独占直达企业详情')
  await expectText(page, '缴费习惯', '企业详情缴费习惯卡')
  await shot(page, '15-company-detail-yunmai')

  await nav(page, '车辆服务收费')
  await expectText(page, '固定车位', '车辆三口径')
  await shot(page, '16-revenue-vehicle')
  await nav(page, '水电能耗收费')
  await expectText(page, '购电', '水电两口径')
  await nav(page, '增值服务收入')
  await expectText(page, '零售服务', '增值类型')
  await shot(page, '17-revenue-va')

  // ===== 服务品质 =====
  await nav(page, '维修工单')
  await expectText(page, '企业报事报修', '工单类型筛选')
  await page.getByRole('button', { name: /仅看超时/ }).click()
  await page.waitForTimeout(500)
  await page.getByRole('row', { name: /WO-/ }).first().click()
  await page.waitForTimeout(600)
  await expectText(page, '处理时间线', '工单详情弹窗')
  await expectText(page, /超时/, '超时徽章')
  await shot(page, '18-wo-overdue-detail')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.getByRole('tab', { name: /投诉/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '精工精密制造', '投诉列表(②未闭环投诉)')
  await shot(page, '19-complaints')
  await page.getByRole('tab', { name: /月度集成分析/ }).click()
  await page.waitForTimeout(600)
  await expectText(page, '本月响应及时率', '月度集成分析指标')
  await shot(page, '20-wo-analysis')

  await nav(page, '维保工单')
  await expectText(page, '消防维保', '维保三类')
  await expectText(page, '计划完成率', '维保指标')
  await shot(page, '21-maintenance')

  await nav(page, '客户满意度')
  await expectText(page, '低分评价', '满意度低分明细')
  await expectText(page, '满意度调研', '调研区块')
  await shot(page, '22-satisfaction')

  // ===== 内控管理 =====
  await nav(page, '日常巡检')
  await expectText(page, '巡检完成率', '巡检 KPI')
  await shot(page, '23-inspections')
  await nav(page, '能耗核抄')
  await expectText(page, /同比|环比/, '核抄同环比')
  await shot(page, '24-meters')
  await nav(page, '工作任务清单')
  await expectText(page, '年度', '任务四级')
  await shot(page, '25-tasks-admin')

  // ===== 门锁管理三 Tab(S12)=====
  await nav(page, '门锁管理')
  await expectText(page, '设备总数', '门锁 KPI 行')
  await expectText(page, '低电量(≤20%)', '低电量 KPI')
  await expectText(page, '远程开锁', '设备行远程开锁按钮')
  await shot(page, '25a-locks-device')
  // 锁详情弹窗:搜索换租故事锁 → 点锁名打开(避开企业链接列)→ 分配历史含迁出企业
  await page.getByPlaceholder('搜索锁名 / SN / 企业').fill('联创电子')
  await page.waitForTimeout(500)
  await page.getByText('B2 栋 101 门锁').first().click()
  await page.waitForTimeout(600)
  await expectText(page, '分配历史', '锁详情分配历史')
  await expectText(page, /星辰视讯/, '迁出企业留档(换租链)')
  await shot(page, '25b-lock-detail-history')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.getByRole('tab', { name: /密码管理/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '云脉智能-访客-张先生', '预置访客密码(今天生效)')
  await expectText(page, '已禁用', '密码状态徽章')
  await shot(page, '25c-locks-passcodes')
  await page.getByRole('tab', { name: /通行记录/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '密码开锁', '通行方式徽章')
  await expectText(page, '密码输入错误', '失败记录(③异常故事)')
  await shot(page, '25d-locks-records')

  // ===== 通知管理 =====
  await nav(page, '通知管理')
  await expectText(page, '停电检修通知:B 区高压配电设备年度检修', '预置停电通知')
  await shot(page, '26-notices')

  // ===== 企业档案三 Tab =====
  await nav(page, '企业档案')
  await expectText(page, '云脉智能科技', '企业列表')
  await page.getByRole('tab', { name: /收款跟进/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '暂缓跟进', '收款跟进三色(②hold)')
  await expectText(page, '缴费习惯', '跟进三依据之一')
  await shot(page, '27-followup-tab')
  await page.getByRole('tab', { name: /发票管理/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '上传发票', '发票管理 Tab')
  await shot(page, '28-invoices-tab')

  // ===== 权限设置:企业③ 改配给王琳 → 两位客服数字实时变化 =====
  await nav(page, '权限设置')
  await expectText(page, '王琳', '权限设置页')
  await shot(page, '29-permissions')
  const huilanCheckbox = page.getByRole('checkbox', { name: /洄澜餐饮管理/ }).first()
  await huilanCheckbox.check()
  await page.getByRole('button', { name: /保存分配/ }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '30-permissions-saved')

  await switchAccount(page, '客服 王琳', '/property/dashboard')
  await expectText(page, '名下 22 家企业', '王琳可见企业 21→22(改配生效)')
  await shot(page, '31-dashboard-wang-22')

  await switchAccount(page, '客服 刘洋', '/property/dashboard')
  await expectText(page, '名下 8 家企业', '刘洋可见企业 9→8(改配生效)')
  await shot(page, '32-dashboard-liu-8')

  // 刘洋:任务清单只见自己
  await nav(page, '工作任务清单')
  await expectText(page, '园区能耗核抄零差错', '刘洋可见自己的年度任务')
  const adminTaskVisible = await page
    .getByText('园区物业费收缴率达成 96%')
    .first()
    .isVisible()
    .catch(() => false)
  check('刘洋不可见主管的任务(内控按人隔离)', !adminTaskVisible)
  await shot(page, '33-tasks-liu')

  // ===== 企业②:通知/账单/发票/调研/AI =====
  await switchAccount(page, '企业② 精工精密制造', '/company/home')
  await expectText(page, '停电检修通知', '企业②首页可见 B 区停电通知')
  await expectText(page, '快捷开门', '首页快捷开门卡(S12)')
  await shot(page, '34-company2-home')

  // 门锁页:一键开门 + 密码自助管理
  await nav(page, '门锁')
  await expectText(page, '我的门锁', '企业门锁页')
  await shot(page, '34a-company2-locks')
  await page.getByRole('button', { name: /一键开门/ }).first().click()
  await page.waitForTimeout(1400)
  await expectText(page, '已开门', '一键开门成功动画/提示')
  await shot(page, '34b-company2-unlocked')
  await page.getByRole('tab', { name: /密码管理/ }).click()
  await page.waitForTimeout(500)
  await expectText(page, '生成访客密码', '访客密码快捷入口')
  await expectText(page, '精工精密-前台-通用', '预置企业密码')
  await shot(page, '34c-company2-passcodes')

  await nav(page, '账单缴费')
  await expectText(page, '当前应缴', '企业②待缴账单')
  await shot(page, '35-company2-bills')

  await nav(page, '发票查询')
  await expectText(page, '下载', '发票下载入口')
  await shot(page, '36-company2-invoices')

  await nav(page, '满意度调研')
  await expectText(page, /调研/, '调研页')
  await shot(page, '37-company2-survey')

  await nav(page, 'AI 咨询')
  await page.getByText('物业费怎么收?').first().click()
  await page.waitForTimeout(1300)
  await expectText(page, /18 元\/㎡·月/, 'AI 咨询命中费率规则')
  await shot(page, '38-company2-chat')

  await nav(page, '企业信息')
  await expectText(page, '缴费习惯', '企业信息只读页')
  await shot(page, '39-company2-profile')

  await browser.close()

  const uniq = [...new Set(errors)]
  console.log(`\n浏览器错误:${uniq.length}`)
  uniq.slice(0, 10).forEach((e) => console.log('  ' + e))
  console.log(
    failures === 0 && uniq.length === 0
      ? '\nsmoke 全部通过 ✅(截图见 scripts/shots/)'
      : `\n${failures} 项断言失败 / ${uniq.length} 个浏览器错误 ❌`,
  )
  process.exit(failures === 0 && uniq.length === 0 ? 0 : 1)
}

void main()
