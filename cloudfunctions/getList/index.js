const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { month, type, category } = event

  const query = { _openid: OPENID }
  if (month) query.date = _.startsWith(month)
  if (type) query.type = type
  if (category) query.category = category

  try {
    const res = await db.collection('records')
      .where(query)
      .orderBy('date', 'desc')
      .limit(100)
      .get()
    return { success: true, list: res.data }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
