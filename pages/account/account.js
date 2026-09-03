const util = require('../../utils/util.js')
const config = require('../../config.js')

const TYPE_LABEL = { cash: '现金', bank: '银行卡', alipay: '支付宝', wechat: '微信' }
const TYPE_ICON = { cash: '💵', bank: '🏦', alipay: '💙', wechat: '💚' }

Page({
  data: {
    list: [],
    totalBalance: '0.00',
    showForm: false,
    editingId: '',
    form: { name: '', type: 'cash', balance: '' },
    typeIndex: 0,
    typeOptions: ['cash', 'bank', 'alipay', 'wechat'],
    typeLabels: ['现金', '银行卡', '支付宝', '微信']
  },

  noop() {},

  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadAccounts()
  },

  applyMock() {
    const mock = require('../../mock/data.js')
    const month = mock.MONTH
    const recs = config.mockEmpty ? [] : mock.records.filter(r => r.date.indexOf(month) === 0)
    const list = (config.mockEmpty ? [] : mock.accountsOf(false).list).map(a => {
      const ar = recs.filter(r => r.account === a._id)
      const income = util.sumBy(ar.filter(r => r.type === 'income'), r => r.amount)
      const expense = util.sumBy(ar.filter(r => r.type === 'expense'), r => r.amount)
      return Object.assign({}, a, {
        monthIn: util.formatMoney(income),
        monthOut: util.formatMoney(expense)
      })
    })
    this.render(list)
  },

  loadAccounts() {
    wx.cloud.callFunction({ name: 'accountOps', data: { action: 'get' } })
      .then(res => {
        if (res.result && res.result.success) this.render(res.result.list)
        else this.render([])
      })
      .catch(() => this.render([]))
  },

  render(list) {
    const arr = (list || []).map(a => Object.assign({}, a, {
      balanceText: util.formatMoney(a.balance),
      typeLabel: TYPE_LABEL[a.type] || a.type,
      icon: TYPE_ICON[a.type] || '💰'
    }))
    const total = util.sumBy(arr, a => a.balance)
    this.setData({ list: arr, totalBalance: util.formatMoney(total) })
  },

  openAdd() {
    this.setData({ showForm: true, editingId: '', typeIndex: 0, form: { name: '', type: 'cash', balance: '' } })
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id
    const acc = this.data.list.find(a => a._id === id)
    if (!acc) return
    const idx = this.data.typeOptions.indexOf(acc.type)
    this.setData({
      showForm: true,
      editingId: id,
      typeIndex: idx >= 0 ? idx : 0,
      form: { name: acc.name, type: acc.type, balance: String(acc.balance) }
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  onName(e) { this.setData({ 'form.name': e.detail.value }) },
  onBalance(e) { this.setData({ 'form.balance': e.detail.value }) },
  onType(e) {
    const i = e.detail.value
    this.setData({ typeIndex: i, 'form.type': this.data.typeOptions[i] })
  },

  save() {
    const f = this.data.form
    const nameCheck = util.validateName(f.name, '账户名称')
    if (!nameCheck.ok) { wx.showToast({ title: nameCheck.msg, icon: 'none' }); return }
    const balCheck = util.validateAmount(f.balance)
    if (!balCheck.ok) { wx.showToast({ title: balCheck.msg, icon: 'none' }); return }

    if (config.useMock) {
      const mock = require('../../mock/data.js')
      if (this.data.editingId) {
        const t = mock.accounts.find(a => a._id === this.data.editingId)
        if (t) { t.name = nameCheck.value; t.type = f.type; t.balance = balCheck.value }
      } else {
        mock.accounts.push({
          _id: 'a' + Date.now(),
          name: nameCheck.value,
          type: f.type,
          balance: balCheck.value,
          isDefault: mock.accounts.length === 0
        })
      }
      this.setData({ showForm: false })
      this.applyMock()
      wx.showToast({ title: '已保存' })
      return
    }

    const payload = {
      action: this.data.editingId ? 'update' : 'add',
      name: nameCheck.value,
      type: f.type,
      balance: balCheck.value
    }
    if (this.data.editingId) payload.id = this.data.editingId
    wx.cloud.callFunction({ name: 'accountOps', data: payload })
      .then(res => {
        if (res.result && res.result.success) {
          this.setData({ showForm: false })
          this.loadAccounts()
          wx.showToast({ title: '已保存' })
        } else {
          wx.showToast({ title: (res.result && res.result.msg) || '保存失败', icon: 'none' })
        }
      })
      .catch(() => wx.showToast({ title: '网络异常', icon: 'none' }))
  },

  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除账户',
      content: '删除后该账户下的历史记账仍保留，只是不再计入账户列表。',
      success: r => {
        if (!r.confirm) return
        if (config.useMock) {
          const mock = require('../../mock/data.js')
          const i = mock.accounts.findIndex(a => a._id === id)
          if (i >= 0) mock.accounts.splice(i, 1)
          this.applyMock()
          wx.showToast({ title: '已删除' })
          return
        }
        wx.cloud.callFunction({ name: 'accountOps', data: { action: 'delete', id: id } })
          .then(() => { this.loadAccounts(); wx.showToast({ title: '已删除' }) })
          .catch(() => wx.showToast({ title: '删除失败，请重试', icon: 'none' }))
      }
    })
  },

  setDefault(e) {
    const id = e.currentTarget.dataset.id
    if (config.useMock) {
      const mock = require('../../mock/data.js')
      mock.accounts.forEach(a => { a.isDefault = (a._id === id) })
      this.applyMock()
      wx.showToast({ title: '已设为默认' })
      return
    }
    wx.cloud.callFunction({ name: 'accountOps', data: { action: 'default', id: id } })
      .then(() => { this.loadAccounts(); wx.showToast({ title: '已设为默认' }) })
      .catch(() => wx.showToast({ title: '设置失败，请重试', icon: 'none' }))
  }
})
