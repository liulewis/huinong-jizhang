const util = require('../../utils/util.js')
const config = require('../../config.js')

Page({
  data: {
    month: '',
    total: '',          // 输入框中的总预算（字符串）
    totalText: '0.00',
    used: 0,
    usedText: '0.00',
    pct: 0,
    over: false,
    items: [],          // [{ category, amount, used, pct, over }]
    editingTotal: false
  },

  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadBudget()
  },

  noop() {},

  applyMock() {
    const mock = require('../../mock/data.js')
    const month = mock.MONTH
    const budget = config.mockEmpty ? null : mock.budgetsOf(month, false).budget
    this.build(month, budget)
  },

  loadBudget() {
    const month = util.formatMonth(new Date())
    wx.cloud.callFunction({ name: 'budgetOps', data: { action: 'get', month: month } })
      .then(res => {
        if (res.result && res.result.success) this.build(month, res.result.budget)
        else this.build(month, null)
      })
      .catch(() => this.build(month, null))
  },

  // 汇总当月支出，并构建预算视图
  build(month, budget) {
    const mock = require('../../mock/data.js')
    const stat = config.useMock
      ? mock.statOf(month, false)
      : { expense: 0, categoryStat: [] }
    const used = stat.expense || 0
    // 预算为空时给一个合理默认结构，便于用户填写
    const total = budget ? budget.total : 0
    const items = (budget && budget.items ? budget.items : []).map(it => {
      const usedCat = (stat.categoryStat || []).find(c => c.category === it.category)
      const usedAmt = usedCat ? usedCat.total : 0
      const pct = it.amount > 0 ? Math.round((usedAmt / it.amount) * 100) : 0
      return {
        category: it.category,
        amount: util.formatMoney(it.amount),
        used: util.formatMoney(usedAmt),
        pct: pct,
        over: it.amount > 0 && usedAmt > it.amount
      }
    })
    this.setData({
      month: month,
      total: total ? String(total) : '',
      totalText: util.formatMoney(total),
      used: used,
      usedText: util.formatMoney(used),
      pct: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
      over: total > 0 && used > total,
      items: items
    })
    if (total > 0 && used > total) {
      wx.showToast({ title: '本月支出已超预算', icon: 'none' })
    }
  },

  openEditTotal() {
    this.setData({ editingTotal: true })
  },
  onTotal(e) { this.setData({ total: e.detail.value }) },
  closeEditTotal() { this.setData({ editingTotal: false }) },

  saveTotal() {
    const check = util.validateBudget(this.data.total)
    if (!check.ok) { wx.showToast({ title: check.msg, icon: 'none' }); return }
    const month = this.data.month
    if (config.useMock) {
      const mock = require('../../mock/data.js')
      let b = mock.budgets.find(x => x.month === month)
      if (!b) {
        b = { _id: 'b' + Date.now(), month: month, total: 0, items: [] }
        mock.budgets.push(b)
      }
      b.total = check.value
      this.setData({ editingTotal: false })
      this.build(month, b)
      wx.showToast({ title: '已保存' })
      return
    }
    wx.cloud.callFunction({ name: 'budgetOps', data: { action: 'setTotal', month: month, total: check.value } })
      .then(res => {
        if (res.result && res.result.success) {
          this.setData({ editingTotal: false })
          this.loadBudget()
          wx.showToast({ title: '已保存' })
        } else {
          wx.showToast({ title: (res.result && res.result.msg) || '保存失败', icon: 'none' })
        }
      })
      .catch(() => wx.showToast({ title: '网络异常', icon: 'none' }))
  },

  onItemAmount(e) {
    const idx = e.currentTarget.dataset.idx
    const val = e.detail.value
    const items = this.data.items.slice()
    if (items[idx]) items[idx].amount = val
    this.setData({ items: items })
  },

  saveItems() {
    const month = this.data.month
    const items = this.data.items.map(it => {
      const check = util.validateBudget(it.amount)
      return { category: it.category, amount: check.value }
    })
    if (config.useMock) {
      const mock = require('../../mock/data.js')
      let b = mock.budgets.find(x => x.month === month)
      if (!b) {
        b = { _id: 'b' + Date.now(), month: month, total: 0, items: [] }
        mock.budgets.push(b)
      }
      b.items = items
      this.build(month, b)
      wx.showToast({ title: '已保存' })
      return
    }
    wx.cloud.callFunction({ name: 'budgetOps', data: { action: 'setItems', month: month, items: items } })
      .then(res => {
        if (res.result && res.result.success) {
          this.loadBudget()
          wx.showToast({ title: '已保存' })
        } else {
          wx.showToast({ title: (res.result && res.result.msg) || '保存失败', icon: 'none' })
        }
      })
      .catch(() => wx.showToast({ title: '网络异常', icon: 'none' }))
  }
})
