STAR.CORE / StarYuki 前端复刻

启动
1. 安装 Node.js 22 或更新版本（如已安装则跳过）。
2. 双击 start.bat，或在本目录执行：npm start
3. 浏览器打开 http://localhost:4173
   首页：http://localhost:4173/
   登录终端：http://localhost:4173/login/

不需要 npm install；所有字体、图片和 p5 均已保存在本地。
也可将 dist 目录直接托管到任意静态网站服务。
请通过 HTTP 服务访问，不要直接双击 HTML 文件，因为资源使用站点根路径。

已实现
- 原站黑色/荧光黄绿布局、字体、品牌图形与响应式断点。
- PEONIA 字符/圆点/像素花朵，鼠标交互和生长动效。
- 顶栏、移动端菜单、ACCESS 页面跳转、滚动显现和标题乱码解码效果。
- 统计面板、SYSTEM.MODULE 卡片、故障画面和页脚。
- CRT 登录终端、启动流程、7 位访问卡输入与本地演示反馈。
- 19 组本地终端音效：输入、退格、传输、扫描、拒绝、恢复和成功；音效开关及偏好保存。
- 键盘焦点、Esc 关闭菜单、减少动态效果偏好和后台动画暂停。

范围
这是前端复刻，不连接原站认证服务、数据库或账户系统。
登录页的输入仅在当前页面用于演示，不提交至服务端，也不保存到浏览器存储。
系统状态沿用参考页面的展示数据，不表示真实在线服务状态。

文件
- dist/index.html：首页结构
- dist/styles.css：首页补充样式
- dist/app.js：菜单、加载和滚动交互
- dist/effects.js：背景点阵与故障效果
- dist/peonia.js：独立花朵视觉程序
- dist/login/、dist/login.css、dist/login.js：登录终端
- dist/sound.js、dist/sound.css、dist/audio/：低延迟音效播放及本地 WAV 资源
- generate-sounds.mjs：重新生成本地合成音效（node generate-sounds.mjs）
- dist/vendor/p5.min.js：p5 1.11.11
- server.mjs：无依赖本地静态服务器
- verify.mjs：语法、路径及可选 HTTP 检查

检查
npm run check
服务器运行时可执行：node verify.mjs --url http://localhost:4173

素材来源
根据用户要求复刻 https://staryuki.com/ 的公开前端。
原站 HTML 布局、CSS、字体、品牌图像及独立 PEONIA 视觉程序于 2026-10-11 获取。
原站 Next.js 业务运行时、认证请求和分析追踪脚本没有打包或运行。
p5 由官方 npm 分发（jsDelivr）取得，许可信息保留在 vendor 文件中。


音效说明（2026-10-20）
依据原站公开 launcher 中的 SFX 事件名称与时序接入，包括验证扫描每 300 毫秒一次、成功提示按 60 毫秒逐格播放。原站音效注册表及登录页当前返回 HTTP 502，无法获取或试听原录音；交付的是本地合成近似音效，未声称原音频一比一还原。首次点击或按键后启用声音，右下角 SFX 可静音。只有音效偏好布尔值保存到 localStorage，访问卡输入不保存。

