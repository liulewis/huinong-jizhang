const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { month } = event

  const query = { _openid: OPENID }
  if (month) query.date = _.startsWith(month)

  try {
    const res = await db.collection('records').where(query).get()
    const list = res.data
    let income = 0
    let expense = 0
    const catMap = {}
    list.forEach(r => {
      const amt = Number(r.amount) || 0
      if (r.type === 'income') {
        income += amt
      } else {
        expense += amt
        catMap[r.category] = (catMap[r.category] || 0) + amt
      }
    })
    const categoryStat = Object.keys(catMap).map(k => ({
      category: k,
      total: Number(catMap[k].toFixed(2))
    }))
    // 作物维度：支出按作物汇总
    const cropMap = {}
    list.forEach(r => {
      if (r.type === 'expense' && r.cropTag) {
        cropMap[r.cropTag] = (cropMap[r.cropTag] || 0) + (Number(r.amount) || 0)
      }
    })
    const cropStat = Object.keys(cropMap).map(k => ({
      crop: k,
      total: Number(cropMap[k].toFixed(2))
    }))
    return {
      success: true,
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      balance: Number((income - expense).toFixed(2)),
      categoryStat: categoryStat,
      cropStat: cropStat
    }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
