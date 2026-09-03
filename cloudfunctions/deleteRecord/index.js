const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event

  if (!id) {
    return { success: false, msg: '缺少 id' }
  }

  try {
    await db.collection('records')
      .where({ _id: id, _openid: OPENID })
      .remove()
    return { success: true }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
