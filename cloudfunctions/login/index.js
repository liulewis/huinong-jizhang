// 慧农记账本 · 登录云函数（家庭/个体农户记账）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext()
  return {
    openid: OPENID,
    appid: APPID
  }
}
