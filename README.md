世界地图 / 世界编年史
这是一个纯前端、多文件版本，不依赖框架，也不依赖第三方库。
目录
index.html
css/base.css
css/layout.css
css/map.css
css/relation.css
css/timeline.css
js/app.js
js/state.js
js/map.js
js/sidebar.js
js/relation.js
js/timeline.js
js/tabs.js
js/utils.js
data/regions.js
data/locations.js
data/factions.js
data/characters.js
data/relations.js
data/events.js
运行
直接双击 `index.html` 即可运行，因为本项目使用普通 `<script src="...">`，没有 ES Module 导入，不需要本地 HTTP 服务器。
数据维护
世界内容全部集中在 `data/`：
locations.js：地点
factions.js：势力
characters.js：人物
relations.js：人物关系、势力关系
events.js：历史事件
regions.js：地图区域
时间轴通过 `startYear / endYear / states` 控制整个世界状态。
