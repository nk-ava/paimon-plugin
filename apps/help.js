import Plugin from "../../../lib/plugins/plugin.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import {Cfg, Version} from "../components/index.js";

let _path = process.cwd();

export class help extends Plugin {
    constructor(e) {
        super({
            name: '派蒙help',
            dsc: '命令帮助',
            event: 'message',
            rule: [
                {
                    reg: '#?派蒙帮助',
                    fnc: 'help'
                },
                {
                    reg: '#?派蒙版本',
                    fnc: 'versionInfo'
                },
                {
                    reg: '#?派蒙设置',
                    fnc: 'pmSet',
                    permission: 'master'
                }
            ]
        });
    }

    async help(e) {
        let helpGroup = [{
            group: "基本功能",
            list: [{
                icon: 'gequ',
                title: '#点歌 天下',
                desc: '返回4首相关歌曲'
            }, {
                icon: "dianzan",
                title: "#赞我",
                desc: "点赞10次，加好友每天自动点赞"
            }, {
                icon: "json",
                title: "#{json}",
                desc: "自己理解"
            }, {
                icon: 'message',
                title: "[引用消息].message",
                desc: '查看所引用的消息'
            }, {
                icon: 'tongji',
                title: "#(更新)祈愿分析",
                desc: "更新或者查看祈愿"
            }, {
                icon: 'LINKS',
                title: "#获取断网链接",
                desc: "抽卡链接，需要绑定米游社ck"
            }, {
                icon: "yuyanfanyi",
                title: '#翻译 ',
                desc: '多种语言翻译，需要配置百度翻译'
            }, {
                icon: 'bangzhu',
                title: "#翻译帮助",
                desc: "翻译的使用帮助"
            }]
        }, {
            group: "派蒙游戏帮助",
            list: [{
                icon: 'zhadan',
                title: '#数字炸弹',
                desc: '群游戏，@其他人加入'
            }, {
                icon: "shuzidizeng",
                title: "#新数独 80",
                desc: '数独游戏'
            }, {
                icon: "boyi",
                title: "#五子棋",
                desc: "群双人游戏，@另一个人加入"
            }, {
                icon: "jiangbei",
                title: "#游戏胜率",
                desc: "查看派蒙游戏的胜率"
            }, {
                icon: 'jinyong',
                title: '#(启用|禁用)群游戏',
                desc: '觉得有点刷屏可以禁用群游戏'
            }, {
                icon: "games",
                title: "#结束游戏",
                desc: "结束正在进行的群游戏"
            }]
        }, {
            group: "米游社相关命令",
            list: [{
                icon: "bangdingjilu",
                title: '#绑定(米游社|崩三)',
                desc: "用户绑定米游社或者崩三ck"
            }, {
                icon: "meiriqiandao",
                title: "#(开启|关闭)(米游社|崩三)自动签到",
                desc: "米游社或崩三自动签到开关"
            }, {
                icon: "yonghu",
                title: "#用户 123",
                desc: '根据关键词返回米游社用户'
            }, {
                icon: "qiandao",
                title: "#(米游社|崩三)签到",
                desc: "米游社或崩三手动签到"
            }, {
                icon: "kuozhanshuxing",
                title: "#(更新)怪物抗性",
                desc: "返回怪物抗性一览表"
            }, {
                icon: 'Id',
                title: "#我的uid",
                desc: '查看崩三当前uid'
            }, {
                icon: 'shuju',
                title: '#崩三1234567#崩三角色',
                desc: '根据uid查看信息'
            }, {
                icon: "-cookie",
                title: "我的ck",
                desc: "私聊返回米游社ck"
            }]
        }, {
            group: "其他指令",
            list: [{
                icon: "caidan",
                title: "#派蒙帮助",
                desc: "派蒙插件提供的功能查看"
            }, {
                icon: "banbenxinxi",
                title: "#派蒙版本",
                desc: "查看版本日志"
            }, {
                icon: 'tianqi',
                title: '#(北京)天气(1~6)',
                desc: '查看天气信息'
            }, {
                icon: 'weizhi',
                title: "#天气设置北京",
                desc: "设置默认的位置"
            }, {}]
        }];
        let admin = {
            group: "管理员命令",
            list: [{
                icon: "zhilingbufa",
                title: '#(开启|关闭)命令模式',
                desc: '命令模式下可以自定义函数'
            }, {
                icon: "JavaScript",
                title: "_print(123)",
                desc: "以_开头的会被当作js代码执行"
            }, {
                icon: "gengxin",
                title: "#派蒙(强制)更新",
                desc: "更新派蒙插件"
            }, {
                icon: "SALT",
                title: '#SALT',
                desc: '查看加好友salt'
            }, {
                icon: 'shezhi',
                title: '#派蒙设置',
                desc: '相关功能的配置'
            }, {
                icon: 'jiahaoyou',
                title: "#加好友",
                desc: '查看当前加好友的状态'
            }, {
                icon: 'cankaodaan',
                title: "#ANSWER",
                desc: "私聊查看加好友设置问题的答案"
            }]
        }
        if (e.isMaster) helpGroup.push(admin);
        let img = await puppeteer.screenshot("help", {
            tplFile: './plugins/paimon-plugin/resources/html/help/index.html',
            saveId: 'paimon_help',
            defaultLayout: `${_path}/plugins/paimon-plugin/resources/html/common/helpDefault.html`,
            bgType: 0,
            helpGroup,
            plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
            commonPath: `${_path}/plugins/paimon-plugin/resources/html/common`,
            copyright: Version.toText
        })
        if (!img) {
            e.reply("生成图片失败");
        } else {
            e.reply(img);
        }
        return true
    }

    async versionInfo(e) {
        let info = Version.changelogs;
        if (!info) {
            e.reply("暂无版本信息");
            return true;
        }
        let changelogs = Version.changelogs;
        let img = await puppeteer.screenshot("versionInfo", {
            tplFile: "./plugins/paimon-plugin/resources/html/versionInfo/versionInfo.html",
            saveId: "versionInfo",
            changelogs,
            elemLayout: `${_path}/plugins/paimon-plugin/resources/html/common/infoElem.html`,
            plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
            commonPath: `${_path}/plugins/paimon-plugin/resources/html/common`,
            copyright: Version.toText
        })
        if (!img) {
            e.reply("生成图片失败");
        } else {
            e.reply(img);
        }
        return true
    }

    async pmSet(e) {
        e.reply(await help.cfgInfo());
    }

    static async cfgInfo() {
        let friendCfg = Cfg.get("friendAuth") || {}
        let weatherCfg = Cfg.get("weather") || {}
        let data = {
            tplFile: './plugins/paimon-plugin/resources/html/pmSet/index.html',
            saveId: 'paimon_set',
            plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
            commonPath: `${_path}/plugins/paimon-plugin/resources/html/common`,
            defaultLayout: `${_path}/plugins/paimon-plugin/resources/html/common/helpDefault.html`,
            schema: [{
                title: '加好友设置',
                cfg: [{
                    title: '加好友方式',
                    key: '加好友',
                    type: 'num',
                    def: "1/2/3",
                    value: `${friendCfg?.type}`,
                    showDesc: true,
                    desc: '1：无限制，申请就会通过，2：常规，需要正确回答问题，3：严格，每通过一个好友就会生成新的问题和答案，需要联系机器人主人获得答案'
                }, {
                    title: 'salt值',
                    key: 'salt=',
                    def: `${friendCfg?.salt}`,
                    value: friendCfg?.type === 3,
                    desc: '严格状态下计算答案所用的salt，取16位MD5("seq=${seq}&salt=${salt})即可得出答案',
                    showDesc: true
                }]
            }, {
                title: "其他设置",
                cfg: [{
                    title: "天气卡片限制",
                    key: "天气卡片",
                    def: "0~9",
                    type: 'num',
                    value: `${weatherCfg?.limit}`,
                    desc: '建议不要太多，机器人发太多卡片消息可能会有危险',
                    showDesc: true
                }]
            }],
            copyright: Version.toText
        }
        return await puppeteer.screenshot("pmSet", data);
    }
}