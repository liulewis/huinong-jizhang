const util = require('../../utils/util.js')
const config = require('../../config.js')

Page({
  data: {
    month: '',
    income: '0.00',
    expense: '0.00',
    balance: '0.00',
    accountsTotal: '0.00',
    budgetTotal: '0.00',
    budgetUsed: '0.00',
    budgetPct: 0,
    budgetOver: false,
    recent: []
  },

  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadStat()
    this.loadExtra()
    this.loadRecent()
  },

  applyMock() {
    const mock = require('../../mock/data.js')
    const r = mock.statOf(mock.MONTH, config.mockEmpty)
    const accTotal = util.sumBy(mock.accountsOf(config.mockEmpty).list, a => a.balance)
    const budget = config.mockEmpty ? null : mock.budgetsOf(mock.MONTH, false).budget
    const bTotal = budget ? budget.total : 0
    const bUsed = r.expense || 0
    const recent = config.mockEmpty ? []
      : mock.records.filter(x => x.date.indexOf(mock.MONTH) === 0)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5)
        .map(x => ({
          date: x.date.slice(5),
          category: x.category,
          type: x.type,
          amount: x.amount,
          cropTag: x.cropTag || ''
        }))
    this.setData({
      month: mock.MONTH,
      income: r.income.toFixed(2),
      expense: r.expense.toFixed(2),
      balance: r.balance.toFixed(2),
      accountsTotal: util.formatMoney(accTotal),
      budgetTotal: util.formatMoney(bTotal),
      budgetUsed: util.formatMoney(bUsed),
      budgetPct: bTotal > 0 ? Math.min(100, Math.round((bUsed / bTotal) * 100)) : 0,
      budgetOver: bTotal > 0 && bUsed > bTotal,
      recent: recent
    })
  },

  loadRecent() {
    wx.cloud.callFunction({ name: 'getList', data: { month: util.formatMonth(new Date()) } })
      .then(res => {
        const raw = (res.result && res.result.list) || []
        const recent = raw.sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 5)
          .map(x => ({
            date: (x.date || '').slice(5),
            category: x.category,
            type: x.type,
            amount: x.amount,
            cropTag: x.cropTag || ''
          }))
        this.setData({ recent: recent })
      })
      .catch(() => {})
  },

  loadStat() {
    const month = util.formatMonth(new Date())
    wx.cloud.callFunction({
      name: 'getStat',
      data: { month: month }
    }).then(res => {
      if (res.result && res.result.success) {
        const r = res.result
        this.setData({
          month: month,
          income: r.income.toFixed(2),
          expense: r.expense.toFixed(2),
          balance: r.balance.toFixed(2)
        })
      }
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 云模式：账户总余额 + 预算进度
  loadExtra() {
    const month = util.formatMonth(new Date())
    Promise.all([
      wx.cloud.callFunction({ name: 'accountOps', data: { action: 'get' } }).then(r => (r.result && r.result.list) || []).catch(() => []),
      wx.cloud.callFunction({ name: 'budgetOps', data: { action: 'get', month: month } }).then(r => (r.result && r.result.budget) || null).catch(() => null),
      wx.cloud.callFunction({ name: 'getStat', data: { month: month } }).then(r => (r.result && r.result) || null).catch(() => null)
    ]).then(([accs, budget, stat]) => {
      const accTotal = util.sumBy(accs, a => a.balance)
      const bTotal = budget ? budget.total : 0
      const bUsed = stat ? stat.expense : 0
      this.setData({
        accountsTotal: util.formatMoney(accTotal),
        budgetTotal: util.formatMoney(bTotal),
        budgetUsed: util.formatMoney(bUsed),
        budgetPct: bTotal > 0 ? Math.min(100, Math.round((bUsed / bTotal) * 100)) : 0,
        budgetOver: bTotal > 0 && bUsed > bTotal
      })
    })
  },

  goAdd() { wx.switchTab({ url: '/pages/add/add' }) },
  goBill() { wx.switchTab({ url: '/pages/bill/bill' }) },
  goStat() { wx.switchTab({ url: '/pages/stat/stat' }) },
  goAccount() { wx.navigateTo({ url: '/pages/account/account' }) },
  goBudget() { wx.navigateTo({ url: '/pages/budget/budget' }) },
  goExport() { wx.navigateTo({ url: '/pages/export/export' }) }
})
