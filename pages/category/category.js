const config = require('../../config.js')

Page({
  data: {
    type: 'expense',
    list: [],
    newName: ''
  },
  onShow() {
    if (config.useMock) { this.applyMock(); return }
    this.loadList()
  },
  applyMock() {
    const mock = require('../../mock/data.js')
    const res = mock.categoriesOf(config.mockEmpty)
    this.setData({ list: res.list[this.data.type] || [] })
  },
  loadList() {
    wx.cloud.callFunction({
      name: 'categoryOps',
      data: { action: 'get' }
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({ list: res.result.list[this.data.type] || [] })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    }).catch(() => {
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },
  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type }, () => this.loadList())
  },
  onName(e) {
    this.setData({ newName: e.detail.value })
  },
  add() {
    const name = (this.data.newName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    if (config.useMock) {
      if (this.data.list.some(c => c.name === name)) {
        wx.showToast({ title: '分类已存在', icon: 'none' })
        return
      }
      this.setData({
        list: this.data.list.concat([{ name: name, custom: true, _id: 'm' + Date.now() }]),
        newName: ''
      })
      wx.showToast({ title: '已添加' })
      return
    }
    wx.cloud.callFunction({
      name: 'categoryOps',
      data: { action: 'add', type: this.data.type, name: name }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({ title: '已添加' })
        this.setData({ newName: '' })
        this.loadList()
      } else {
        wx.showToast({ title: (res.result && res.result.msg) || '添加失败', icon: 'none' })
      }
    }).catch(() => {
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },
  del(e) {
    const id = e.currentTarget.dataset.id
    if (config.useMock) {
      this.setData({ list: this.data.list.filter(c => c._id !== id) })
      wx.showToast({ title: '已删除' })
      return
    }
    wx.showModal({
      title: '删除分类',
      content: '仅删除自定义分类，已记账记录不受影响',
      success: r => {
        if (r.confirm) {
          wx.cloud.callFunction({
            name: 'categoryOps',
            data: { action: 'delete', id: id }
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
