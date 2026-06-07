// M12 浏览器 UI 冒烟测试:以真实用户姿势(点击导航,不整页刷新——内存 store 刷新即重置)
// 遍历两端全部页面,收集运行时错误并截图。前置:dev server 5173。运行:npx tsx scripts/smoke.ts
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright'

const BASE = 'http://localhost:5173'
const SHOTS = 'scripts/shots'
mkdirSync(SHOTS, { recursive: true })

const errors: string[] = []
let failures = 0

function check(name: string, cond: boolean) {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failures++
    console.error(`  ✗ ${name}`)
  }
}

async function expectText(page: Page, text: string, name?: string) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 6000 })
    check(name ?? `可见「${text}」`, true)
  } catch {
    check(name ?? `可见「${text}」`, false)
  }
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})

async function login(username: string) {
  await page.goto(`${BASE}/login`)
  await page.fill('#username', username)
  await page.fill('#password', '123456')
  await page.click('button[type=submit]')
}

// ============ 登录页 ============
console.log('\n[登录页]')
await page.goto(`${BASE}/login`)
await expectText(page, '和美物业 AI OS')
await expectText(page, '演示账号')
await shot(page, '00-login')

// ============ 物业端(单次登录,侧栏点击导航)============
console.log('\n[物业端] 驾驶舱')
await login('admin')
await page.waitForURL('**/property/dashboard')
await page.waitForTimeout(900) // 等图表渲染
await expectText(page, '物业费收缴率')
await expectText(page, '重要事项 / 风险清单')
await expectText(page, '今日经营摘要')
await shot(page, '10-dashboard')

console.log('\n[物业端] 日报')
await page.getByRole('link', { name: '日报' }).click()
await expectText(page, '今日事项')
await expectText(page, '原始来源条目')
await shot(page, '11-daily-report')

console.log('\n[物业端] 工单列表 + 超时单详情')
await page.getByRole('link', { name: '工单 / 投诉' }).click()
await expectText(page, '维修工单')
await shot(page, '12-work-orders')
await page.getByRole('button', { name: '仅看超时' }).click()
await page.locator('table tbody tr').first().click()
await expectText(page, '处理时间线')
await expectText(page, '超时', '超时标记显示')
await shot(page, '13-work-order-detail')
await page.keyboard.press('Escape')

console.log('\n[物业端] 投诉 Tab')
await page.getByRole('tab', { name: /投诉/ }).click()
await expectText(page, '主管介入中')
await shot(page, '14-complaints')

console.log('\n[物业端] 催缴 → 李强判断依据(户档案)')
await page.getByRole('link', { name: '催缴' }).click()
await expectText(page, '建议催缴')
await expectText(page, '暂缓催缴')
await expectText(page, '数据待核实')
await shot(page, '15-dunning')
await page.getByRole('row', { name: /李强/ }).getByRole('link', { name: '判断依据' }).click()
await expectText(page, '催缴前置判断')
await expectText(page, '存在 1 条未闭环投诉', '判断依据命中投诉规则')
await shot(page, '18-dossier-dunning')

console.log('\n[物业端] 户档案内查看工单 → Modal 原地打开,关闭后留在户档案(回归)')
await page.getByRole('tab', { name: /工单记录/ }).click()
await page.getByRole('button', { name: '查看' }).first().click()
await expectText(page, '处理时间线', '工单详情 Modal 打开')
check('打开详情后仍在户档案路由', page.url().includes('/property/households/HY-2-1-0202'))
await shot(page, '19-wo-detail-modal')
await page.keyboard.press('Escape')
await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
check('关闭详情后停留在户档案页', page.url().includes('/property/households/HY-2-1-0202'))
await expectText(page, '工单记录', '户档案内容仍可见')

console.log('\n[物业端] 缴费钻取:小区 → 楼栋 → 单元/户')
await page.getByRole('link', { name: '缴费 / 收款' }).click()
await expectText(page, '全公司:应收')
await shot(page, '16-payments-communities')
await page.locator('[data-slot=card]').filter({ hasText: '和园' }).first().click()
await expectText(page, '楼栋收缴')
await page.locator('[data-slot=card]').filter({ hasText: '2栋' }).first().click()
await expectText(page, '单元 / 户')
await expectText(page, '查看档案')
await shot(page, '17-payments-households')

// ============ 业主端 ============
console.log('\n[业主端] 张伟登录 → 催缴弹窗')
await login('zhangwei')
await page.waitForURL('**/resident/payments')
await expectText(page, '物业费催缴通知', '催缴弹窗自动弹出')
await shot(page, '20-dunning-popup')
await page.getByRole('button', { name: '稍后再说' }).click()
await expectText(page, '当前应缴款项')
await shot(page, '21-resident-payments')

console.log('\n[业主端] 工单列表 + 待签字详情')
await page.getByRole('link', { name: '报修工单' }).click()
await expectText(page, '待您签字')
await shot(page, '22-resident-workorders')
await page.locator('[data-slot=card]').filter({ hasText: '待您签字' }).first().click()
await expectText(page, '电子签字')
await shot(page, '23-resident-wo-detail')

console.log('\n[业主端] 投诉 / AI 咨询 / 个人信息')
await page.getByRole('link', { name: '投诉' }).click()
await page.getByRole('link', { name: '发起投诉' }).click()
await expectText(page, '关联工单(选填)')
await page.getByRole('link', { name: 'AI 咨询' }).click()
await page.getByText('物业费怎么收?').first().click()
await page.waitForTimeout(1100)
await expectText(page, '2.5 元/㎡·月', 'AI 客服规则回复')
await shot(page, '24-resident-chat')
await page.getByRole('link', { name: '我的', exact: true }).click()
await expectText(page, '基本信息')
await shot(page, '25-resident-profile')

await browser.close()

// ============ 汇总 ============
if (errors.length) {
  console.error(`\n❌ 捕获 ${errors.length} 条浏览器错误:`)
  for (const e of [...new Set(errors)]) console.error('  ' + e.slice(0, 300))
} else {
  console.log('\n✓ 无浏览器运行时错误')
}
console.log(failures === 0 && errors.length === 0 ? '\n✅ UI 冒烟测试通过' : `\n❌ ${failures} 项断言失败`)
process.exit(failures === 0 && errors.length === 0 ? 0 : 1)
