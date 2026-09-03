// 慧农记账本 · 云开发配置（家庭/个体农户记账）
// 说明：慧农记账本 的 useMock=true 时使用本地 mock 数据，便于在开发者工具直接预览；正式上线后改为 false
module.exports = {
  appName: '慧农记账本',
  tagline: '家庭/个体农户记账',
  envId: 'your-cloud-env-id',
  // 慧农记账本 预览模式：true 时使用本地 mock，便于在无云环境时直接预览（家庭/个体农户记账）
  useMock: true,
  // 慧农记账本 空状态演示：true 时列表返回空数组，用于验证空状态 UI；false 恢复完整业务数据
  mockEmpty: false
}
