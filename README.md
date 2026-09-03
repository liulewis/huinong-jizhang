# 慧农记账本（微信云开发小程序骨架）

农业场景的轻量记账小程序，用于申请软件著作权（软著）并可直接上线运行。
技术栈：微信小程序原生 + 微信云开发（云函数 + 云数据库）。

## 目录结构
```
huinong-jizhang/
├── app.js / app.json / app.wxss      # 全局逻辑与配置
├── config.js                         # 云开发环境 ID（需修改）
├── project.config.json / sitemap.json
├── utils/util.js                     # 日期工具
├── pages/
│   ├── index/  首页（本月概览 + 记一笔入口）
│   ├── add/    记一笔（收/支、分类、金额、日期、备注、作物/地块 + 历史作物快捷标签）
│   ├── bill/   账单（本月列表、删除二次确认）
│   ├── stat/   统计（收入/支出/结余、支出占比环形图[分类/作物切换]、近6月趋势柱状图）
│   └── category/ 分类管理（自定义分类增删，预设不可删）
└── cloudfunctions/
    ├── login/       获取 openid
    ├── addRecord/   新增记录（服务端校验 + openid 隔离）
    ├── getList/     查询列表（按月份/类型/分类）
    ├── getStat/     统计汇总（含分类占比 + 作物维度支出汇总）
    ├── deleteRecord/ 删除记录
    ├── categoryOps/ 分类管理（get/add/delete，预设 + 自定义）
    ├── getCrops/    历史作物去重列表（记一笔页快捷选择）
    └── getTrend/    近 6 月收支趋势（柱状图数据源）
```

## 运行步骤
1. 在微信公众平台注册小程序，获取 **AppID**。
2. 用「微信开发者工具」导入项目，目录选本 `huinong-jizhang`，填入 AppID。
3. 顶部开通「云开发」，创建环境，复制 **环境 ID**。
4. 将 `config.js` 的 `envId` 改为你的环境 ID；将 `project.config.json` 的 `appid` 改为你的 AppID。
5. 在 `cloudfunctions/` 下对每个云函数右键「上传并部署：云端安装依赖」：login / addRecord / getList / getStat / deleteRecord / categoryOps / getCrops / getTrend。
6. 在云开发控制台创建数据库集合：
   - `records`（记录存储，权限设为仅创建者可读写）
   - `categories`（自定义分类存储，权限设为仅创建者可读写）
7. 编译预览，即可记一笔 / 管分类 / 查账单 / 看统计与趋势。

## 数据库集合
- `records`：`{ _openid, type:'income'|'expense', category, amount(Number), date('YYYY-MM-DD'), note, cropTag, createdAt }`
- `categories`：`{ _openid, type:'income'|'expense', name, createdAt }`

## 新增能力（RD2 / RD3）
- **自定义分类**：预设分类（种子/化肥/农药/饲料/人工/水电/其他、销售/补贴/其他）不可删；用户可在「分类管理」页新增/删除自定义分类。记一笔页分类从云拉取。
- **作物维度**：记一笔可填「作物/地块」，输入时展示历史作物快捷标签；统计页支出占比可在「分类 / 作物」间切换；getStat 返回 `cropStat`。
- **图表增强**：统计页用 Canvas 2D 绘制支出占比环形图与近 6 月收支趋势柱状图（替代原 CSS 条形图）。

## 软著说明
- 源代码：前端 `pages/*` + `app.js` + `utils/*` + `cloudfunctions/*` 合计可凑足前后各 30 页（每页 ≥50 行）。
- 说明书：本 README + 各页面截图即可组织用户手册。
- 安全：云函数已用 `OPENID` 做归属校验；`records` 集合安全规则建议设为 `doc._openid == auth.openid`。
