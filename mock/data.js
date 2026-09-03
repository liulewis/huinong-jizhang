// 慧农记账本 · 本地 Mock 数据层（家庭/个体农户记账）
// 慧农记账本：当 config.useMock 为 true 时，各页面直接读取本模块，无需云开发环境即可预览 慧农记账本 的所有页面。
// 数据结构与 cloudfunctions 返回结构保持一致，覆盖列表页 / 详情页 / 空状态场景。
// 说明：原随机占位图（picsum）已弃用，凭证以纯文本备注呈现，避免外链与图文不符问题。

const util = require('../utils/util.js')

const NOW = new Date()
const MONTH = util.formatMonth(NOW)
const TODAY = util.formatDate(NOW)

// ---------- 分类（预设 + 自定义）----------
const PRESET_EXPENSE = ['种子', '化肥', '农药', '饲料', '人工', '水电', '其他']
const PRESET_INCOME = ['销售', '补贴', '其他']
const customExpense = [
  { name: '电商运费', _id: 'ce1' },
  { name: '农机租赁', _id: 'ce2' }
]
const customIncome = [
  { name: '合作社分红', _id: 'ci1' }
]

// ---------- 历史作物（记一笔快捷选择）----------
const cropTags = ['1号棚番茄', '东北玉米地', '果园东区', '温室黄瓜']

// ---------- 多账户（账户管理）----------
// type: cash 现金 / bank 银行卡 / alipay 支付宝 / wechat 微信
const accounts = [
  { _id: 'a1', name: '现金钱包', type: 'cash', balance: 5200.00, isDefault: true },
  { _id: 'a2', name: '农商银行卡', type: 'bank', balance: 18600.50, isDefault: false },
  { _id: 'a3', name: '微信零钱', type: 'wechat', balance: 3240.80, isDefault: false }
]

// ---------- 记账记录（本月 10 条，含收入 / 支出 / 作物 / 账户维度）----------
const records = [
  { _id: 'r1', type: 'expense', amount: 120.00, category: '种子', cropTag: '1号棚番茄', account: 'a1', date: MONTH + '-03', note: '番茄育苗基质' },
  { _id: 'r2', type: 'expense', amount: 240.00, category: '化肥', cropTag: '东北玉米地', account: 'a2', date: MONTH + '-05', note: '底肥尿素' },
  { _id: 'r3', type: 'expense', amount: 80.00, category: '农药', cropTag: '温室黄瓜', account: 'a1', date: MONTH + '-08', note: '防虫吡虫啉' },
  { _id: 'r4', type: 'income', amount: 3200.00, category: '销售', cropTag: '1号棚番茄', account: 'a2', date: MONTH + '-12', note: '批发市场发往城区' },
  { _id: 'r5', type: 'expense', amount: 150.00, category: '人工', cropTag: '果园东区', account: 'a1', date: MONTH + '-15', note: '疏果用工' },
  { _id: 'r6', type: 'expense', amount: 60.00, category: '水电', cropTag: '温室黄瓜', account: 'a3', date: MONTH + '-18', note: '滴灌电费' },
  { _id: 'r7', type: 'income', amount: 800.00, category: '补贴', cropTag: '', account: 'a2', date: MONTH + '-20', note: '农资综合补贴' },
  { _id: 'r8', type: 'expense', amount: 45.00, category: '其他', cropTag: '', account: 'a1', date: MONTH + '-22', note: '农具小修' },
  { _id: 'r9', type: 'expense', amount: 300.00, category: '种子', cropTag: '东北玉米地', account: 'a2', date: MONTH + '-25', note: '玉米良种' },
  { _id: 'r10', type: 'income', amount: 1500.00, category: '销售', cropTag: '果园东区', account: 'a3', date: MONTH + '-28', note: '早熟苹果直销' }
]

// ---------- 预算（按月，总预算 + 分类预算）----------
// total: 当月总支出预算；items: 分类预算明细（amount 为该分类上限，0 表示不限）
const budgets = [
  {
    _id: 'b1',
    month: MONTH,
    total: 3000.00,
    items: [
      { category: '种子', amount: 600.00 },
      { category: '化肥', amount: 500.00 },
      { category: '农药', amount: 300.00 },
      { category: '人工', amount: 800.00 },
      { category: '水电', amount: 200.00 }
    ]
  }
]

// ---------- 慧农记账本 · 对外方法（结构与云函数返回一致）----------

// 账单列表：getList（支持搜索）
function billList(month, empty, search) {
  if (empty) return { success: true, list: [] }
  let list = records.filter(r => r.date.indexOf(month) === 0)
  const s = search || {}
  if (s.keyword) {
    const kw = s.keyword.trim().toLowerCase()
    list = list.filter(r =>
      (r.note || '').toLowerCase().includes(kw) ||
      (r.category || '').toLowerCase().includes(kw) ||
      (r.cropTag || '').toLowerCase().includes(kw))
  }
  if (s.type) list = list.filter(r => r.type === s.type)
  if (s.category) list = list.filter(r => r.category === s.category)
  if (s.account) list = list.filter(r => r.account === s.account)
  if (s.start && s.end) {
    list = list.filter(r => r.date >= s.start && r.date <= s.end)
  }
  return { success: true, list: list }
}

// 统计：getStat
function statOf(month, empty) {
  if (empty) {
    return { success: true, income: 0, expense: 0, balance: 0, categoryStat: [], cropStat: [], accountStat: [] }
  }
  const list = records.filter(r => r.date.indexOf(month) === 0)
  let income = 0
  let expense = 0
  const catMap = {}
  const cropMap = {}
  const accMap = {}
  list.forEach(r => {
    const amt = Number(r.amount) || 0
    if (r.type === 'income') {
      income += amt
    } else {
      expense += amt
      catMap[r.category] = (catMap[r.category] || 0) + amt
      if (r.cropTag) cropMap[r.cropTag] = (cropMap[r.cropTag] || 0) + amt
    }
    const accName = (accounts.find(a => a._id === r.account) || {}).name || '默认账户'
    accMap[accName] = (accMap[accName] || 0) + amt
  })
  const categoryStat = Object.keys(catMap).map(k => ({ category: k, total: Number(catMap[k].toFixed(2)) }))
  const cropStat = Object.keys(cropMap).map(k => ({ crop: k, total: Number(cropMap[k].toFixed(2)) }))
  const accountStat = Object.keys(accMap).map(k => ({ account: k, total: Number(accMap[k].toFixed(2)) }))
  return {
    success: true,
    income: Number(income.toFixed(2)),
    expense: Number(expense.toFixed(2)),
    balance: Number((income - expense).toFixed(2)),
    categoryStat: categoryStat,
    cropStat: cropStat,
    accountStat: accountStat
  }
}

// 趋势：getTrend（近 6 个月）
function trendOf() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1)
    months.push(util.formatMonth(d))
  }
  const income = [4200, 5100, 3800, 6000, 4700, statOf(MONTH).income]
  const expense = [2100, 2600, 1900, 2800, 2300, statOf(MONTH).expense]
  return { success: true, months: months, income: income, expense: expense }
}

// 分类：categoryOps action=get
function categoriesOf(empty) {
  if (empty) return { success: true, list: { expense: [], income: [] } }
  const expense = PRESET_EXPENSE.map(n => ({ name: n, custom: false }))
    .concat(customExpense.map(c => ({ name: c.name, custom: true, _id: c._id })))
  const income = PRESET_INCOME.map(n => ({ name: n, custom: false }))
    .concat(customIncome.map(c => ({ name: c.name, custom: true, _id: c._id })))
  return { success: true, list: { expense: expense, income: income } }
}

// 历史作物：getCrops
function cropTagsOf() {
  return { success: true, list: cropTags }
}

// 账户：accountOps action=get
function accountsOf(empty) {
  if (empty) return { success: true, list: [] }
  return { success: true, list: accounts.slice() }
}

// 预算：budgetOps
function budgetsOf(month, empty) {
  if (empty) return { success: true, budget: null }
  const budget = budgets.find(b => b.month === month) || null
  return { success: true, budget: budget }
}

// 导出：exportRows（按月份，返回原始记录数组供页面转 CSV）
function exportRows(month, empty) {
  if (empty) return { success: true, rows: [] }
  const list = records.filter(r => r.date.indexOf(month) === 0)
  return { success: true, rows: list.slice() }
}

module.exports = {
  MONTH: MONTH,
  TODAY: TODAY,
  accounts: accounts,
  budgets: budgets,
  records: records,
  billList: billList,
  statOf: statOf,
  trendOf: trendOf,
  categoriesOf: categoriesOf,
  cropTagsOf: cropTagsOf,
  accountsOf: accountsOf,
  budgetsOf: budgetsOf,
  exportRows: exportRows
}
