const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 预算管理云函数（按月）
// action: get | setTotal | setItems（默认 get）
exports.main = async (event) => {
  // SEC 修复：统一从服务端获取调用者身份，预算数据按 _openid 隔离
  const { OPENID } = cloud.getWXContext()
  const e = event || {}
  const action = e.action || 'get'
  const month = e.month

  try {
    if (action === 'get') {
      const res = await db.collection('budgets')
        .where({ _openid: OPENID, month: month }).limit(100).get()
      const budget = (res.data || [])[0] || null
      return { success: true, openid: OPENID, budget: budget }
    }

    if (action === 'setTotal') {
      if (!month) return { success: false, msg: '缺少 month' }
      const total = Number(e.total) || 0
      const exist = await db.collection('budgets')
        .where({ _openid: OPENID, month: month }).limit(1).get()
      if ((exist.data || []).length) {
        await db.collection('budgets')
          .where({ _openid: OPENID, month: month }).update({ data: { total: total } })
      } else {
        await db.collection('budgets').add({
          data: { month: month, total: total, items: [], createTime: db.serverDate() }
        })
      }
      return { success: true, openid: OPENID, msg: '已保存' }
    }

    if (action === 'setItems') {
      if (!month) return { success: false, msg: '缺少 month' }
      const items = Array.isArray(e.items) ? e.items.map(it => ({
        category: it.category,
        amount: Number(it.amount) || 0
      })) : []
      const exist = await db.collection('budgets')
        .where({ _openid: OPENID, month: month }).limit(1).get()
      if ((exist.data || []).length) {
        await db.collection('budgets')
          .where({ _openid: OPENID, month: month }).update({ data: { items: items } })
      } else {
        await db.collection('budgets').add({
          data: { month: month, total: 0, items: items, createTime: db.serverDate() }
        })
      }
      return { success: true, openid: OPENID, msg: '已保存' }
    }

    return { success: false, msg: 'unknown action: ' + action }
  } catch (err) {
    return { success: false, msg: String(err && err.message || err), budget: null }
  }
}
