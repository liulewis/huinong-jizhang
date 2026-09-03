const util = require('../../utils/util.js')
const config = require('../../config.js')

const TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' }
]

Page({
  data: {
    month: '',
    monthOptions: [],
    monthIndex: 0,
    rawList: [],          // 当月全量记录
    list: [],             // 过滤后展示
    filteredTotal: '0.00',
    showSearch: false,
    search: { keyword: '', type: 'all', category: '', account: '', start: '', end: '' },
    typeOptions: TYPE_OPTIONS,
    typeLabels: ['全部', '收入', '支出'],
    typeIndex: 0,
    categoryOptions: [],
    accountOptions: [],
    categoryIndex: 0,
    accountIndex: 0
  },

  onLoad() {
    const opts = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      opts.push(util.formatMonth(d))
    }
    this.setData({ monthOptions: opts, month: util.formatMonth(now), monthIndex: 0 })
  },

  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadOptions()
    this.loadList()
  },

  onMonth(e) {
    const i = e.detail.value
    this.setData({ monthIndex: i, month: this.data.monthOptions[i] }, () => {
      if (config.useMock) this.applyMock()
      else this.loadList()
    })
  },

  applyMock() {
    const mock = require('../../mock/data.js')
    const month = this.data.month || mock.MONTH
    const raw = mock.billList(month, config.mockEmpty).list
    const cats = mock.categoriesOf(config.mockEmpty).list
    const accs = mock.accountsOf(config.mockEmpty).list
    const categoryOptions = ['全部'].concat(cats.expense.map(c => c.name), cats.income.map(c => c.name))
    const accountOptions = ['全部'].concat(accs.map(a => a.name))
    this.setData({ month: month, rawList: raw, categoryOptions: categoryOptions, accountOptions: accountOptions }, () => this.filterList())
  },

  loadOptions() {
    Promise.all([
      wx.cloud.callFunction({ name: 'categoryOps', data: { action: 'get' } }).then(r => r.result).catch(() => null),
      wx.cloud.callFunction({ name: 'accountOps', data: { action: 'get' } }).then(r => r.result).catch(() => null)
    ]).then(([catRes, accRes]) => {
      const cats = (catRes && catRes.list) || { expense: [], income: [] }
      const accs = (accRes && accRes.list) || []
      const categoryOptions = ['全部'].concat((cats.expense || []).map(c => c.name), (cats.income || []).map(c => c.name))
      const accountOptions = ['全部'].concat(accs.map(a => a.name))
      this.setData({ categoryOptions: categoryOptions, accountOptions: accountOptions })
    })
  },

  loadList() {
    const month = this.data.month
    wx.cloud.callFunction({ name: 'getList', data: { month: month } })
      .then(res => {
        const raw = (res.result && res.result.list) || []
        this.setData({ month: month, rawList: raw }, () => this.filterList())
      })
      .catch(() => {
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ rawList: [], list: [] })
      })
  },

  // 根据 search 过滤 rawList
  filterList() {
    const s = this.data.search
    const kw = (s.keyword || '').trim().toLowerCase()
    const list = this.data.rawList.filter(r => {
      if (kw) {
        const hay = ((r.note || '') + ' ' + (r.category || '') + ' ' + (r.cropTag || '')).toLowerCase()
        if (!hay.includes(kw)) return false
      }
      if (s.type !== 'all' && r.type !== s.type) return false
      if (s.category && s.category !== '全部' && r.category !== s.category) return false
      if (s.account && s.account !== '全部' && this.accName(r.account) !== s.account) return false
      if (s.start && s.end && (r.date < s.start || r.date > s.end)) return false
      return true
    })
    let total = 0
    list.forEach(r => { total += (Number(r.amount) || 0) })
    this.setData({ list: list, filteredTotal: util.formatMoney(total) })
  },

  accName(id) {
    const acc = this.data.accountOptions.find(a => a === id)
    return acc || id
  },

  toggleSearch() { this.setData({ showSearch: !this.data.showSearch }) },
  clearSearch() {
    this.setData({
      search: { keyword: '', type: 'all', category: '', account: '', start: '', end: '' },
      typeIndex: 0, categoryIndex: 0, accountIndex: 0
    }, () => this.filterList())
  },

  onKeyword(e) { this.setData({ 'search.keyword': e.detail.value }, () => this.filterList()) },
  onType(e) {
    const i = e.detail.value
    this.setData({ typeIndex: i, 'search.type': this.data.typeOptions[i].value }, () => this.filterList())
  },
  onCategory(e) {
    const i = e.detail.value
    this.setData({ categoryIndex: i, 'search.category': this.data.categoryOptions[i] }, () => this.filterList())
  },
  onAccount(e) {
    const i = e.detail.value
    this.setData({ accountIndex: i, 'search.account': this.data.accountOptions[i] }, () => this.filterList())
  },
  onStart(e) { this.setData({ 'search.start': e.detail.value }, () => this.filterList()) },
  onEnd(e) { this.setData({ 'search.end': e.detail.value }, () => this.filterList()) },

  del(e) {
    const id = e.currentTarget.dataset.id
    if (config.useMock) {
      this.setData({
        rawList: this.data.rawList.filter(r => r._id !== id),
        list: this.data.list.filter(r => r._id !== id)
      })
      wx.showToast({ title: '已删除' })
      return
    }
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: r => {
        if (r.confirm) {
          wx.cloud.callFunction({
            name: 'deleteRecord',
            data: { id: id }
          }).then(res => {
            if (res.result && res.result.success) {
              wx.showToast({ title: '已删除' })
              this.loadList()
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          })
          .catch(() => wx.showToast({ title: '删除失败，请重试', icon: 'none' }))
        }
      }
    })
  }
})
