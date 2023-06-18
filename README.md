# paimon-plugin

Yunzai-V3自用插件

### 使用帮助

1.克隆项目
> 在YunZai-V3项目的plugins目录下

```
git clone https://github.com/zlh-debug/paimon-plugin.git
```

2.安装依赖
> 在YunZai根目录下，注：不是在plugins目录下

```
pnpm add iconv-lite -w
pnpm add node-uuid -w
pnpm add string.ify -w
pnpm add utf-8-validate -w              //sandbox的必需模块
----canvas的安装过程可能有些缓慢，需要耐心等待，没有需求可以设置snadbox: false
----若在config/config/startCfg.yaml将sandbox修改为false则不需要安装以下依赖
----可选的模块可以在config/config/startCfg.yaml配置
pnpm add canvas -w                      //可选
pnpm add cheerio -w                     //可选
pnpm add riichi -w                      //可选
pnpm add syanten -w                     //可选
```

### 常用命令

* 【#更新祈愿分析】：自动发送断网链接，返回生成的分析结果。
* 【#祈愿分析】：同时查看角色，武器和常驻的抽卡结果。
* 【#获取断网链接】：需绑定米游社ck，私聊返回断网链接。
* 【#怪物抗性】：查看原神怪物抗性一览表
* 【#更新怪物抗性】：更新
* ...

### 游戏命令

* 【#数组炸弹】：QQ群游戏，只能在群里玩。可能有未知错误。
* 【#新数独】：QQ游戏，可群也可私聊玩。
* ...

> 更多命令查看【#派蒙帮助】

### 其他

* 帮助界面参考了[喵喵插件 Miao-Plugin](https://github.com/yoimiya-kokomi/miao-plugin)
* 使用协议-[我的oicq分支](https://github.com/zlh-debug/oicq/tree/dev) ，部分功能直接依赖于协议。
* 使用[miao-yunzai分支](https://github.com/zlh-debug/Miao-Yunzai/tree/master) 。