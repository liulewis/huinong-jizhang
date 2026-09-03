// 慧农记账本 · 小程序入口（家庭/个体农户记账）
// 慧农记账本 负责云开发初始化与全局数据管理
// 慧农记账本 · 小程序入口（家庭/个体农户记账）
// 慧农记账本 负责云开发初始化与全局数据管理
// 慧农记账本 · 小程序入口（家庭/个体农户记账）
// 慧农记账本 负责云开发初始化与全局数据管理
const config = require('./config.js')

App({
  globalData: {
    envId: config.envId
  },
  onLaunch() {
    if (!wx.cloud) {
      return
    }
    wx.cloud.init({
      env: config.envId,
      traceUser: true
    })
  }
})
