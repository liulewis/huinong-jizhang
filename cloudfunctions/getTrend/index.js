const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function formatMonth(d) {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  return y + '-' + m
}

// 返回近 6 个月（含本月）的收支汇总，用于趋势图
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(formatMonth(d))
  }
  const start = months[0]
  try {
    const res = await db.collection('records')
      .where({ _openid: OPENID, date: _.gte(start) })
      .limit(100)
      .get()
    const map = {}
    months.forEach(m => { map[m] = { income: 0, expense: 0 } })
    res.data.forEach(r => {
      const m = (r.date || '').slice(0, 7)
      if (map[m]) {
        const amt = Number(r.amount) || 0
        if (r.type === 'income') map[m].income += amt
        else map[m].expense += amt
      }
    })
    const income = months.map(m => Number(map[m].income.toFixed(2)))
    const expense = months.map(m => Number(map[m].expense.toFixed(2)))
    return { success: true, months: months, income: income, expense: expense }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
