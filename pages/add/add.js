const util = require('../../utils/util.js')
const config = require('../../config.js')

Page({
  data: {
    type: 'expense',
    catList: { expense: [], income: [] },
    categories: [],
    category: '',
    cropSuggest: [],
    accounts: [],
    accountIndex: 0,
    account: '',
    amount: '',
    date: '',
    note: '',
    cropTag: ''
  },

  onLoad() {
    this.setData({ date: util.formatDate(new Date()) })
    if (config.useMock) { this.applyMock(); return }
    this.loadCategories()
    this.loadCrops()
    this.loadAccounts()
  },

  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadCategories()
    this.loadCrops()
    this.loadAccounts()
  },

  applyMock() {
    const mock = require('../../mock/data.js')
    const list = mock.categoriesOf(config.mockEmpty).list
    this.setData({ catList: list })
    this.applyCategories(this.data.type, list)
    this.setData({ cropSuggest: mock.cropTagsOf().list })
    this.applyAccounts(mock.accountsOf(config.mockEmpty).list)
  },

  loadAccounts() {
    wx.cloud.callFunction({ name: 'accountOps', data: { action: 'get' } })
      .then(res => {
        if (res.result && res.result.success) this.applyAccounts(res.result.list || [])
      })
      .catch(() => {})
  },

  applyAccounts(list) {
    const arr = (list || []).map(a => a.name)
    const idx = arr.findIndex(n => n)
    this.setData({ accounts: arr, accountIndex: 0, account: arr[0] || '' })
  },

  loadCategories() {
    wx.cloud.callFunction({
      name: 'categoryOps',
      data: { action: 'get' }
    }).then(res => {
      if (res.result && res.result.success) {
        const list = res.result.list
        this.setData({ catList: list })
        this.applyCategories(this.data.type, list)
      } else {
        wx.showToast({ title: '分类加载失败', icon: 'none' })
      }
    }).catch(() => {})
  },

  loadCrops() {
    wx.cloud.callFunction({
      name: 'getCrops',
      data: {}
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({ cropSuggest: res.result.list })
      }
    }).catch(() => {})
  },

  applyCategories(type, list) {
    const names = (list[type] || []).map(i => i.name)
    const keep = this.data.category && names.includes(this.data.category)
    this.setData({ categories: names, category: keep ? this.data.category : (names[0] || '') })
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ type: type })
    this.applyCategories(type, this.data.catList)
  },

  onCategory(e) {
    this.setData({ category: this.data.categories[e.detail.value] })
  },

  onAccount(e) {
    const i = e.detail.value
    this.setData({ accountIndex: i, account: this.data.accounts[i] })
  },

  onAmount(e) {
    this.setData({ amount: e.detail.value })
  },
  onDate(e) {
    this.setData({ date: e.detail.value })
  },
  onNote(e) {
    this.setData({ note: e.detail.value })
  },
  onCrop(e) {
    this.setData({ cropTag: e.detail.value })
  },

  pickCrop(e) {
    this.setData({ cropTag: e.currentTarget.dataset.crop })
  },

  manageCategory() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  save() {
    const d = this.data
    const amountCheck = util.validateAmount(d.amount)
    if (!amountCheck.ok) { wx.showToast({ title: amountCheck.msg, icon: 'none' }); return }
    if (!d.category) { wx.showToast({ title: '请选择分类', icon: 'none' }); return }
    const noteCheck = util.validateNote(d.note)
    if (!noteCheck.ok) { wx.showToast({ title: noteCheck.msg, icon: 'none' }); return }

    if (config.useMock) {
      wx.showToast({ title: '已保存（预览模式）' })
      this.setData({ amount: '', note: '', cropTag: '' })
      return
    }
    wx.cloud.callFunction({
      name: 'addRecord',
      data: {
        type: d.type,
        category: d.category,
        amount: amountCheck.value,
        date: d.date,
        note: noteCheck.value,
        cropTag: d.cropTag,
        account: d.account
      }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({ title: '已保存' })
        this.setData({ amount: '', note: '', cropTag: '' })
        this.loadCrops()
      } else {
        wx.showToast({ title: (res.result && res.result.msg) || '保存失败', icon: 'none' })
      }
    }).catch(() => {
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  }
})
