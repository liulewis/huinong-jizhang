const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 返回当前用户记录中出现过的作物/地块（去重），用于记一笔页快捷选择
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const res = await db.collection('records')
      .where({ _openid: OPENID, cropTag: _.exists(true) })
      .limit(100)
      .get()
    const set = new Set()
    res.data.forEach(r => {
      if (r.cropTag) set.add(r.cropTag)
    })
    return { success: true, list: Array.from(set) }
  } catch (e) {
    return { success: false, msg: e.message }
  }
}
