// 慧农记账本 · 业务工具函数：日期格式化、金额/面积/数量校验、数据聚合、导出等
// 慧农记账本 各页面统一引用本模块，保证家庭/个体农户记账场景下的校验与格式化规则一致。

// ---------- 慧农记账本 · 日期/周期工具 ----------
function formatMonth(d) {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  return y + '-' + m
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return y + '-' + m + '-' + day
}

// 慧农记账本 · 解析日期字符串（如家庭/个体农户记账相关日期），失败返回 null
function parseDate(str) {
  if (!str) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}

// 给定月份生成起止日期字符串，用于家庭/个体农户记账相关的月度统计与区间查询
function monthRange(month) {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const next = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1)
  return {
    start: month + '-01',
    end: formatDate(new Date(next.getFullYear(), next.getMonth(), 0))
  }
}

// ---------- 慧农记账本 · 金额/数值工具 ----------
// 金额格式化（保留两位小数），适用于家庭/个体农户记账场景中的金额展示
function formatMoney(n) {
  const v = Number(n)
  if (isNaN(v)) return '0.00'
  return v.toFixed(2)
}

// 金额/单价校验：返回 { ok, value, msg }，用于家庭/个体农户记账相关输入校验
function validateAmount(input) {
  if (input === '' || input == null) return { ok: false, value: 0, msg: '请输入金额' }
  const s = String(input).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { ok: false, value: 0, msg: '金额格式不正确，最多两位小数' }
  }
  const v = Number(s)
  if (v <= 0) return { ok: false, value: 0, msg: '金额需大于 0' }
  if (v > 100000000) return { ok: false, value: 0, msg: '金额过大，请核对' }
  return { ok: true, value: v, msg: '' }
}

// 备注/描述校验：返回 { ok, value, msg }，控制家庭/个体农户记账相关备注长度
function validateNote(input) {
  const s = (input || '').trim()
  if (s.length > 50) return { ok: false, value: '', msg: '备注不超过 50 字' }
  return { ok: true, value: s, msg: '' }
}

// 慧农记账本 · 名称校验：账户、分类、家庭/个体农户记账相关名称输入
function validateName(input, label) {
  const s = (input || '').trim()
  if (!s) return { ok: false, value: '', msg: '请输入' + (label || '名称') }
  if (s.length > 20) return { ok: false, value: '', msg: (label || '名称') + '不超过 20 字' }
  return { ok: true, value: s, msg: '' }
}

// 慧农记账本 · 预算/租金/目标值校验（允许 0 表示不限制）
function validateBudget(input) {
  const s = String(input || '').trim()
  if (s === '') return { ok: true, value: 0, msg: '' }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { ok: false, value: 0, msg: '预算格式不正确' }
  }
  const v = Number(s)
  if (v < 0) return { ok: false, value: 0, msg: '预算不能为负' }
  if (v > 100000000) return { ok: false, value: 0, msg: '预算过大' }
  return { ok: true, value: v, msg: '' }
}

// ---------- 慧农记账本 · 数据分组与聚合 ----------
// 按指定字段分组，返回对象形式的 Map，用于家庭/个体农户记账分类统计
function groupBy(list, keyFn) {
  const map = {}
  ;(list || []).forEach(item => {
    const k = keyFn(item)
    if (!map[k]) map[k] = []
    map[k].push(item)
  })
  return map
}

// 慧农记账本 · 对指定字段求和，支持金额、面积、数量等累计统计
function sumBy(list, keyFn) {
  return (list || []).reduce((s, i) => s + (Number(keyFn(i)) || 0), 0)
}

// 慧农记账本 · 安全取值，避免空对象或嵌套属性缺失导致页面异常
function safeGet(obj, path, fallback) {
  try {
    const parts = path.split('.')
    let cur = obj
    for (const p of parts) {
      if (cur == null) return fallback
      cur = cur[p]
    }
    return cur == null ? fallback : cur
  } catch (e) {
    return fallback
  }
}

// ---------- 慧农记账本 · 数据导出 ----------
// 生成 CSV 文本，用于慧农记账本的数据导出/分享
function toCSV(headers, rows) {
  const escape = v => {
    const s = (v == null ? '' : String(v))
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const head = headers.map(h => escape(h.label)).join(',')
  const body = rows.map(r => headers.map(h => escape(safeGet(r, h.key, ''))).join(',')).join('\n')
  return head + '\n' + body
}

// 慧农记账本 · 将记录对象转换为导出行（字段顺序固定）
function recordToRow(r) {
  return {
    date: r.date,
    type: r.type === 'income' ? '收入' : '支出',
    category: r.category,
    account: r.account || '默认账户',
    cropTag: r.cropTag || '',
    amount: r.amount,
    note: r.note || ''
  }
}

module.exports = {
  formatMonth: formatMonth,
  formatDate: formatDate,
  parseDate: parseDate,
  monthRange: monthRange,
  formatMoney: formatMoney,
  validateAmount: validateAmount,
  validateNote: validateNote,
  validateName: validateName,
  validateBudget: validateBudget,
  groupBy: groupBy,
  sumBy: sumBy,
  safeGet: safeGet,
  toCSV: toCSV,
  recordToRow: recordToRow
}
