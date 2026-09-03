const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 账户管理云函数
// action: get | add | update | delete | default（默认 get）
exports.main = async (event) => {
  // SEC 修复：统一从服务端获取调用者身份，账户数据按 _openid 隔离
  const { OPENID } = cloud.getWXContext()
  const e = event || {}
  const action = e.action || 'get'

  try {
    if (action === 'get') {
      const res = await db.collection('accounts')
        .where({ _openid: OPENID }).orderBy('createTime', 'desc').limit(100).get()
      return { success: true, openid: OPENID, list: res.data }
    }

    if (action === 'add') {
      if (!e.name) return { success: false, msg: '账户名称不能为空' }
      // 首个账户自动设为默认
      const cnt = await db.collection('accounts').where({ _openid: OPENID }).count()
      const addRes = await db.collection('accounts').add({
        data: {
          name: e.name,
          type: e.type || 'cash',
          balance: Number(e.balance) || 0,
          isDefault: cnt.total === 0
        }
      })
      return { success: true, openid: OPENID, msg: '已保存', _id: addRes._id }
    }

    if (action === 'update') {
      if (!e.id) return { success: false, msg: '缺少 id' }
      const data = {}
      if (e.name !== undefined) data.name = e.name
      if (e.type !== undefined) data.type = e.type
      if (e.balance !== undefined) data.balance = Number(e.balance) || 0
      await db.collection('accounts').where({ _openid: OPENID, _id: e.id }).update({ data })
      return { success: true, openid: OPENID, msg: '已保存' }
    }

    if (action === 'delete') {
      if (!e.id) return { success: false, msg: '缺少 id' }
      await db.collection('accounts').where({ _openid: OPENID, _id: e.id }).remove()
      return { success: true, openid: OPENID, msg: '已删除' }
    }

    if (action === 'default') {
      if (!e.id) return { success: false, msg: '缺少 id' }
      await db.collection('accounts').where({ _openid: OPENID }).update({ data: { isDefault: false } })
      await db.collection('accounts').where({ _openid: OPENID, _id: e.id }).update({ data: { isDefault: true } })
      return { success: true, openid: OPENID, msg: '已设为默认' }
    }

    return { success: false, msg: 'unknown action: ' + action }
  } catch (err) {
    return { success: false, msg: String(err && err.message || err), list: [] }
  }
}
