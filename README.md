# PickMe 聚餐盲盒

聚餐时再也不用纠结吃什么。收录大家爱吃的餐厅，聚餐时点一下「开盲盒」，随机抽一家，像拆盲盒一样。

## 数据怎么存（重要）
网站有**两类**餐厅数据，互不冲突：

| 来源 | 存在哪里 | 谁能看到 | 怎么改 |
| --- | --- | --- | --- |
| **数据文件** `restaurants.json` | 仓库里，随部署发布 | 所有人一致 | 你手动编辑文件 → 提交 → Vercel 自动重新部署 |
| **本机临时** | 浏览器 `localStorage` | 仅你这台设备 | 页面里点「添加」，刷新仍在，清缓存/换设备会丢 |

盲盒抽取时，会同时从这**两类**里随机选，所以临时加的店也能立刻被抽到。

## 加餐厅的两种方式
1. **常去的店（永久）**：编辑根目录的 `restaurants.json`，按格式加一条，提交后部署即生效。
   ```json
   { "name": "店名", "category": "hotpot", "note": "备注", "location": "位置" }
   ```
   `category` 可选：`hotpot`(火锅) `jp`(日料) `bbq`(烧烤) `sichuan`(川菜) `west`(西餐) `tea`(奶茶) `other`(其他)。
2. **临时想加一家（本机）**：在「餐厅库」点「添加」，仅存在本机。

> 餐厅库里：来自文件的店标有「数据文件」，只能「隐藏」（仅本机不再抽到，文件里仍保留）；本机的店可编辑 / 删除，删除带「撤销」。

## 本地预览
```bash
python3 -m http.server 5173     # 然后打开 http://localhost:5173
# 或
npx serve .
```
> 必须用本地服务器预览（不能直接双击 `index.html`），否则浏览器会拦截对 `restaurants.json` 的读取。

## 部署到 Vercel
纯静态站点，无需构建。

### 方式一：Git 推送（推荐，改数据即自动更新）
1. 把整个项目（含 `index.html`、`assets/`、`restaurants.json`、`vercel.json`）推到 GitHub / GitLab。
2. 在 [Vercel](https://vercel.com) 导入仓库 → Framework Preset 选 **Other**（或留空），Output Directory 填 `.`。
3. 以后想加常去店铺，直接改 `restaurants.json` 提交，Vercel 自动重新部署。

### 方式二：Vercel CLI
```bash
npm i -g vercel
vercel          # 首次部署，按提示登录
vercel --prod   # 发布到生产环境
```

## 目录结构
```
.
├── index.html              # 页面结构
├── restaurants.json        # 常去餐厅（手动维护的数据源）
├── vercel.json             # 静态站部署配置
├── assets/
│   ├── css/styles.css      # 设计系统 & 组件样式
│   └── js/app.js           # 状态管理、增删改、随机抽取逻辑
└── README.md
```
