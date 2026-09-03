const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 预设分类（不可删除，始终展示）
const PRESETS = {
  expense: ['种子', '化肥', '农药', '饲料', '人工', '水电', '其他'],
  income: ['销售', '补贴', '其他']
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  // 查询分类：返回预设 + 用户自定义（按 type 分组）
  if (action === 'get') {
    try {
      const res = await db.collection('categories').where({ _openid: OPENID }).get()
      const list = { expense: [], income: [] }
      PRESETS.expense.forEach(n => list.expense.push({ name: n, custom: false }))
      PRESETS.income.forEach(n => list.income.push({ name: n, custom: false }))
      res.data.forEach(c => {
        if (list[c.type]) list[c.type].push({ name: c.name, custom: true, _id: c._id })
      })
      return { success: true, list: list }
    } catch (e) {
      return { success: false, msg: e.message }
    }
  }

  // 新增自定义分类
  if (action === 'add') {
    const { name, type } = event
    if (!name || !type) return { success: false, msg: '缺少参数' }
    if (!PRESETS[type]) return { success: false, msg: '分类类型错误' }
    if (name.length > 10) return { success: false, msg: '分类名称过长' }
    try {
      const exist = await db.collection('categories')
        .where({ _openid: OPENID, type: type, name: name })
        .get()
      if (exist.data.length) return { success: false, msg: '分类已存在' }
      if (PRESETS[type].includes(name)) return { success: false, msg: '与预设分类重名' }
      const r = await db.collection('categories').add({
        data: { _openid: OPENID, type: type, name: name, createdAt: db.serverDate() }
      })
      return { success: true, _id: r._id }
    } catch (e) {
      return { success: false, msg: e.message }
    }
  }

  // 删除自定义分类
  if (action === 'delete') {
    const { id } = event
    if (!id) return { success: false, msg: '缺少 id' }
    try {
      await db.collection('categories')
        .where({ _id: id, _openid: OPENID })
        .remove()
      return { success: true }
    } catch (e) {
      return { success: false, msg: e.message }
    }
  }

  return { success: false, msg: '未知操作' }
}
