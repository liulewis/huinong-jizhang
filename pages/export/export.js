const util = require('../../utils/util.js')
const config = require('../../config.js')

const HEADERS = [
  { key: 'date', label: '日期' },
  { key: 'type', label: '类型' },
  { key: 'category', label: '分类' },
  { key: 'account', label: '账户' },
  { key: 'cropTag', label: '作物/地块' },
  { key: 'amount', label: '金额(元)' },
  { key: 'note', label: '备注' }
]

Page({
  data: {
    scope: 'month',            // month | all
    month: '',
    monthOptions: [],
    monthIndex: 0,
    count: 0,
    csv: '',
    preview: []
  },

  onLoad() {
    // 生成近 12 个月选项
    const opts = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      opts.push(util.formatMonth(d))
    }
    this.setData({ monthOptions: opts, month: util.formatMonth(now), monthIndex: 0 })
  },

  onScope(e) {
    this.setData({ scope: e.currentTarget.dataset.scope })
  },

  onMonth(e) {
    const i = e.detail.value
    this.setData({ monthIndex: i, month: this.data.monthOptions[i] })
  },

  // 生成 CSV 文本
  generate() {
    const scope = this.data.scope
    const month = this.data.month
    const nameMap = {}
    let rows = []

    if (config.useMock) {
      const mock = require('../../mock/data.js')
      mock.accounts.forEach(a => { nameMap[a._id] = a.name })
      rows = scope === 'all'
        ? mock.billList('', config.mockEmpty).list
        : mock.exportRows(month, config.mockEmpty).rows
    } else {
      wx.showLoading({ title: '生成中' })
      // 云模式：按范围拉取列表
      const data = scope === 'all' ? {} : { month: month }
      wx.cloud.callFunction({ name: 'getList', data: data })
        .then(res => {
          rows = (res.result && res.result.list) || []
          this.finish(rows, nameMap)
          wx.hideLoading()
        })
        .catch(() => { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }) })
      return
    }
    this.finish(rows, nameMap)
  },

  finish(rows, nameMap) {
    const csvRows = rows.map(r => {
      const row = util.recordToRow(r)
      row.account = nameMap[r.account] || r.account || '默认账户'
      return row
    })
    const csv = util.toCSV(HEADERS, csvRows)
    this.setData({ csv: csv, count: csvRows.length, preview: csvRows.slice(0, 20) })
  },

  // 复制到剪贴板（可直接粘贴到 Excel / 记事本）
  copy() {
    if (!this.data.csv) { wx.showToast({ title: '请先生成', icon: 'none' }); return }
    wx.setClipboardData({
      data: this.data.csv,
      success: () => wx.showToast({ title: '已复制，可粘贴到 Excel', icon: 'success' })
    })
  },

  // 保存为 csv 文件并唤起转发 / 打开
  saveFile() {
    if (!this.data.csv) { wx.showToast({ title: '请先生成', icon: 'none' }); return }
    const fs = wx.getFileSystemManager()
    const name = this.data.scope === 'all' ? '记账导出_全部' : ('记账导出_' + this.data.month)
    const filePath = `${wx.env.USER_DATA_PATH}/${name}.csv`
    try {
      fs.writeFileSync(filePath, this.data.csv, 'utf8')
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      return
    }
    wx.showModal({
      title: '已生成文件',
      content: '文件已保存到本地，可转发给电脑或微信好友后用 Excel 打开。',
      confirmText: '转发文件',
      success: r => {
        if (r.confirm) {
          wx.shareFileMessage({
            filePath: filePath,
            fileName: name + '.csv',
            fail: () => wx.showToast({ title: '当前环境不支持转发，请使用复制', icon: 'none' })
          })
        }
      }
    })
  }
})
