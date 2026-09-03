const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { type, category, amount, date, note, cropTag } = event

  if (!type || !category || amount === undefined || !date) {
    return { success: false, msg: '缺少必填项' }
  }
  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return { success: false, msg: '金额格式不正确' }
  }

  try {
    const res = await db.collection('records').add({
      data: {
        _openid: OPENID,
        type: type,
        category: category,
        amount: Number(Number(amount).toFixed(2)),
        date: date,
        note: note || '',
        cropTag: cropTag || '',
        createdAt: db.serverDate()
      }
    })
    return { success: true, _id: res._id }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
