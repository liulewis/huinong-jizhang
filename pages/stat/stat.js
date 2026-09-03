const util = require('../../utils/util.js')
const config = require('../../config.js')

const PALETTE = ['#07c160', '#ff9f40', '#5b8ff9', '#f6bd16', '#9270ca', '#73d13d', '#ff7875', '#36cfc9', '#ffc53d', '#9254de']

Page({
  data: {
    month: '',
    income: '0.00',
    expense: '0.00',
    balance: '0.00',
    mode: 'category',          // category | crop | account
    breakdown: [],             // 当前维度的占比明细（含颜色）
    accountStat: [],           // 账户维度统计
    budgetItems: [],           // 预算执行对比（分类预算 vs 实际）
    trend: { months: [], income: [], expense: [] }
  },
  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadStat()
    this.loadTrend()
  },
  applyMock() {
    const mock = require('../../mock/data.js')
    const r = mock.statOf(mock.MONTH, config.mockEmpty)
    const breakdown = this.buildBreakdown(this.data.mode, r)
    const t = mock.trendOf()
    const budget = config.mockEmpty ? null : mock.budgetsOf(mock.MONTH, false).budget
    const budgetItems = (budget && budget.items ? budget.items : []).map(it => {
      const usedCat = (r.categoryStat || []).find(c => c.category === it.category)
      const actual = usedCat ? usedCat.total : 0
      return {
        category: it.category,
        budget: util.formatMoney(it.amount),
        actual: util.formatMoney(actual),
        pct: it.amount > 0 ? Math.round((actual / it.amount) * 100) : 0,
        over: it.amount > 0 && actual > it.amount
      }
    })
    this.setData({
      month: mock.MONTH,
      income: r.income.toFixed(2),
      expense: r.expense.toFixed(2),
      balance: r.balance.toFixed(2),
      breakdown: breakdown,
      accountStat: (r.accountStat || []).map(i => ({ name: i.account, total: i.total })),
      budgetItems: budgetItems,
      trend: t
    }, () => this.drawCharts())
  },
  onReady() {
    // canvas 节点就绪后再补画一次，避免首次 onShow 早于 onReady
    this.drawCharts()
  },
  loadStat() {
    const month = util.formatMonth(new Date())
    wx.cloud.callFunction({
      name: 'getStat',
      data: { month: month }
    }).then(res => {
      if (res.result && res.result.success) {
        const r = res.result
        const breakdown = this.buildBreakdown(this.data.mode, r)
        this.setData({
          month: month,
          income: r.income.toFixed(2),
          expense: r.expense.toFixed(2),
          balance: r.balance.toFixed(2),
          breakdown: breakdown,
          accountStat: (r.accountStat || []).map(i => ({ name: i.account, total: i.total }))
        })
        this.drawDonut()
      }
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },
  loadTrend() {
    wx.cloud.callFunction({
      name: 'getTrend',
      data: {}
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({ trend: res.result })
        this.drawTrend()
      }
    }).catch(() => {})
  },
  buildBreakdown(mode, r) {
    let src
    if (mode === 'category') src = (r.categoryStat || []).slice()
    else if (mode === 'crop') src = (r.cropStat || []).slice()
    else src = (r.accountStat || []).slice()
    src.sort((a, b) => b.total - a.total)
    const total = src.reduce((s, i) => s + i.total, 0)
    return src.map((i, idx) => ({
      name: mode === 'category' ? i.category : (mode === 'crop' ? i.crop : i.account),
      total: i.total,
      pct: total ? Math.round((i.total / total) * 100) : 0,
      color: PALETTE[idx % PALETTE.length]
    }))
  },
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode: mode }, () => {
      this.loadStat()
    })
  },
  getDpr() {
    try {
      if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 2
      return wx.getSystemInfoSync().pixelRatio || 2
    } catch (e) {
      return 2
    }
  },
  drawCharts() {
    this.drawDonut()
    this.drawTrend()
  },
  drawDonut() {
    const dpr = this.getDpr()
    wx.createSelectorQuery().in(this).select('#donutCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const w = res[0].width
      const h = res[0].height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const data = this.data.breakdown
      const total = data.reduce((s, i) => s + i.total, 0)
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) / 2 - 8
      const inner = r * 0.62

      if (!total) {
        ctx.fillStyle = '#999'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('暂无支出数据', cx, cy)
        return
      }
      let start = -Math.PI / 2
      data.forEach(item => {
        const angle = (item.total / total) * 2 * Math.PI
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, r, start, start + angle)
        ctx.closePath()
        ctx.fillStyle = item.color
        ctx.fill()
        start += angle
      })
      ctx.beginPath()
      ctx.arc(cx, cy, inner, 0, 2 * Math.PI)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.fillStyle = '#333'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('支出', cx, cy - 8)
      ctx.fillStyle = '#07c160'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(total.toFixed(2), cx, cy + 12)
    })
  },
  drawTrend() {
    const t = this.data.trend
    if (!t || !t.months || !t.months.length) return
    const dpr = this.getDpr()
    wx.createSelectorQuery().in(this).select('#trendCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const w = res[0].width
      const h = res[0].height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const months = t.months
      const income = t.income
      const expense = t.expense
      const pad = 28
      const n = months.length
      const chartW = w - pad * 2
      const chartH = h - pad * 2 - 18
      const max = Math.max(1, ...income, ...expense)
      const baseY = pad + chartH

      ctx.strokeStyle = '#eee'
      ctx.beginPath()
      ctx.moveTo(pad, baseY)
      ctx.lineTo(w - pad, baseY)
      ctx.stroke()

      const groupW = chartW / n
      const barW = Math.min(14, groupW * 0.32)
      months.forEach((m, i) => {
        const x0 = pad + i * groupW + groupW / 2
        const ih = (income[i] / max) * chartH
        const eh = (expense[i] / max) * chartH
        ctx.fillStyle = '#07c160'
        ctx.fillRect(x0 - barW - 2, baseY - ih, barW, ih)
        ctx.fillStyle = '#e64340'
        ctx.fillRect(x0 + 2, baseY - eh, barW, eh)
        ctx.fillStyle = '#666'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(m.slice(5), x0, baseY + 4)
      })
    })
  }
})
