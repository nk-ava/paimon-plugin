import Plugin from "../../../lib/plugins/plugin.js";
import fs from "node:fs";
import util from "util";
import common from "../../../lib/common/common.js";
import fetch from "node-fetch";
import stringify from "../components/models/stringify/index.js"
import browserPuppeteer from "../components/models/BrowserPuppeteer.js";
import {playerGameInfo} from "../components/models/GameData.js";
import {Version, Cfg} from "../components/index.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js";

const _path = process.cwd()
let watch = {state: true}
let subIdMap = new Map
const stringify_config = stringify.configure({
    pure: false,
    json: false,
    maxDepth: 5,
    maxLength: 50,
    maxArrayLength: 5000,
    maxObjectLength: 200,
    maxStringLength: 5000,
    precision: undefined,
    formatter: undefined,
    pretty: true,
    rightAlignKeys: true,
    fancy: false,
    indentation: '  ',
})

class subIdNode {
    constructor(qq, nickname, state) {
        this.qqInfo = {}
        this.qqInfo[qq] = nickname
        this.state = state
        this.identity = []
        this.timer = null
        this.date = (new Date()).toLocaleDateString()
    }

    recall(t) {
        if (this.timer) clearTimeout(this.timer)
        this.state = false
        this.timer = setTimeout(() => {
            this.state = true
        }, t)
    }
}

export class example extends Plugin {
    constructor(e) {
        super({
            name: 'PM插件',
            dsc: 'js插件',
            event: 'message',
            priority: 100,
            rule: [
                {
                    reg: '^(M_onlyPm_)?#paimon Test$',
                    fnc: 'test'
                },
                {
                    reg: '^(M_onlyPm_)?#?watch[-_:]anonymous[-_:](on|off)$',
                    fnc: "watchAnon",
                    permission: 'master'
                },
                {
                    reg: '^(M_onlyPm_)?#?派蒙设置匿名推送(开启|关闭)',
                    fnc: "AnonMsg",
                    permission: "master"
                },
                {
                    reg: '^(M_onlyPm_)?#?派蒙设置匿名冷却\\d+s',
                    fnc: 'setCD',
                    permission: "master"
                },
                {
                    reg: '^(M_onlyPm_)?#?赞我',
                    fnc: 'userThumbUp'
                },
                {
                    reg: '^(M_onlyPm_)?\\.(.*)$|^#getMessage$',
                    fnc: 'getMessage'
                },
                {
                    reg: '^(M_onlyPm_)?状态 (.*)$',
                    fnc: 'killQQ'
                },
                {
                    reg: '^(M_onlyPm_)?#*(更新)?怪物抗性',
                    fnc: 'resistance'
                },
                {
                    reg: '^(M_onlyPm_)?(#用户|#mysUser)\\s(.*)',
                    fnc: "mysUserInfo"
                },
                {
                    reg: '^(M_onlyPm_)?#游戏胜率',
                    fnc: 'playerInfo'
                },
                {
                    reg: "^(M_onlyPm_)?pb解码",
                    fnc: 'pbDecode'
                }
            ]
        });
        this.cfg = Cfg.get("example")
        if (!this.cfg) {
            this.cfg = {mute: true, cd: 600000}
            Cfg.set("example", this.cfg)
        }
    }

    accept(e) {
        if (e.isPrivate) return
        if (watch.state) {
            if (e.anonymous) {
                let qqInfo = subIdMap.get(`${e.group_id}-${e.sender.sub_id}`)
                if (qqInfo && (new Date()).toLocaleDateString() !== qqInfo.date) {
                    qqInfo.date = (new Date()).toLocaleDateString()
                    qqInfo.identity = []
                }
                if (qqInfo && (qqInfo.state || !qqInfo.identity.includes(e.anonymous.name))) {
                    if (!qqInfo.identity.includes(e.anonymous.name)) {
                        qqInfo.identity.push(e.anonymous.name)
                    }
                    let anonymous = ""
                    Object.keys(qqInfo.qqInfo).forEach(k => {
                        anonymous += `\n${k} (${qqInfo.qqInfo[k]})`
                    })
                    qqInfo.recall(this.cfg.cd)
                    if (this.cfg.mute)
                        Bot.pickFriend(Version.masterQQ[0]).sendMsg(`匿名推送【群${e.group_id}(${e.group_name})】：\n消息内容：${e.msg}\n可疑对象：${anonymous}\n时间：${(new Date(e.time * 1000)).toLocaleString()}`)
                    else
                        e.reply(`可疑对象：${anonymous}`, true)
                }
                return
            }
            let sub_id = e.sender.sub_id
            if (sub_id && sub_id !== 1 && sub_id !== "undefined") {
                let info = subIdMap.get(`${e.group_id}-${sub_id}`)
                if (!info) {
                    subIdMap.set(`${e.group_id}-${sub_id}`, new subIdNode(e.sender.user_id, e.sender.nickname, true))
                    return
                }
                info.qqInfo[e.sender.user_id] = e.sender.nickname
            }
        }
    }

    test() {
        this.e.reply("发送消息成功！！");
    }

    setCD(e) {
        let t = e.msg.match(/\d+/)[0]
        if (t) {
            this.cfg.cd = Number(t) * 1000
            Cfg.set("example", this.cfg)
        }
        e.reply("设置成功：" + this.cfg.cd / 1000 + "s")
    }

    AnonMsg(e) {
        if (e.msg.includes("开启")) {
            if (!this.cfg.mute) {
                this.cfg.mute = true
                Cfg.set("example", this.cfg)
            }
            e.reply("开启成功")
        } else {
            if (this.cfg.mute) {
                this.cfg.mute = false
                Cfg.set("example", this.cfg)
            }
            e.reply("关闭成功")
        }
        return true
    }

    watchAnon(e) {
        let msg = e.msg.replace("M_onlyPm_", "")
        watch.state = (msg.split(/[-_:]/)[2] === "on")
        e.reply("当前状态: " + watch.state)
        if (!watch.state) subIdMap.clear()
        return true
    }

    async pbDecode(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        let str = msg.replace(/pb解码\s?/, "");
        let arr
        if (str.includes(" ")) {
            arr = str.split(/[\s\n]/).filter(a => a && a.trim()).map(a => {
                return Number('0x' + a)
            });
        } else {
            arr = []
            str = str.replace(/\n/g, "")
            for (let i = 0; i < str.length; i += 2) {
                arr.push(Number("0x" + str.substr(i, 2)))
            }
        }
        let body = Buffer.from(arr);
        try {
            core.pb.decode(body)
        } catch {
            body = body.slice(4)
        }
        try {
            let msg = []
            let decodeMsg = {}
            let decoded = deepDecode(body, 1, decodeMsg);
            msg.push(JSON.stringify(decoded, myToStr, "  "));
            let raw_msg = []
            raw_msg.push(stringify_config(decoded))
            Object.entries(decodeMsg).forEach(v => {
                v[1].forEach(vs => {
                    raw_msg.push(stringify_config(vs))
                })
            })
            let s = await common.makeForwardMsg(e, raw_msg, "若有乱码点击查看encoded")
            msg.push(s)
            e.reply(await common.makeForwardMsg(e, msg, "点击查看解码结果"));
        } catch (err) {
            e.reply("出错了：" + toString(err));
        }
        return true;
    }

    async userThumbUp(e) {
        if (await this.thumbUp(e.user_id, 10)) {
            e.reply([segment.at(e.user_id), {type: "text", text: " 点赞完成"}]);
        } else {
            e.reply([segment.at(e.user_id), {type: "text", text: " 点赞失败，请检查是否已经点过10个赞"}]);
        }
        return true;
    }

    async thumbUp(uid, times = 1) {
        if (times > 20) times = 20;
        const ReqFavorite = Bot.fl.get(uid) ? core.jce.encodeStruct([
            core.jce.encodeNested([
                Bot.uin, 1, Bot.sig.seq + 1, 1, 0, Buffer.from("0C180001060131160131", "hex")
            ]),
            uid, 0, 1, Number(times)
        ]) : core.jce.encodeStruct([
            core.jce.encodeNested([
                Bot.uin, 1, Bot.sig.seq + 1, 1, 0, Buffer.from("0C180001060131160135", "hex")
            ]),
            uid, 0, 5, Number(times)
        ]);
        const body = core.jce.encodeWrapper({ReqFavorite}, "VisitorSvc", "ReqFavorite");
        const payload = await Bot.sendUni("VisitorSvc.ReqFavorite", body);
        return core.jce.decodeWrapper(payload)[0][3] === 0;
    }

    async getMessage(e) {
        if (!e.source) {
            //直接返回，不提示
            return true;
        }
        let t = e.friend || e.group;
        let mss;
        if (e.isPrivate) mss = await t.getChatHistory(e.source.time + 1, 1);
        else mss = await t.getChatHistory(e.source.seq, 1);
        if (typeof mss === "undefined" || mss.length === 0) {
            e.reply("未获得到聊天记录");
            return true;
        }
        let msg = e.msg?.replace("M_onlyPm_", "");
        if (msg[0] === "#") {
            e.reply(mss.toString());
            return true;
        }
        let cmd = msg.split(/\.|\[|\]/g);
        for (let i in cmd) if (cmd[i] === '') cmd.splice(i, 1);
        mss = mss[0];
        if (cmd[0] === '') {
            let s = toString(mss);
            e.reply(s);
            return true;
        }
        let ans = dfs(mss, 0, cmd.length, cmd);
        if (typeof ans != "undefined") {
            let s = toString(ans);
            e.reply(s);
        } else {
            e.reply("请检查输入是否正确");
        }
        return true;
    }

    async killQQ(e) {
        e.reply([e.isGroup ? segment.at(e.user_id) : "", " 正在查询请稍后.."]);
        let url = "https://jubao.qq.com//uniform_impeach/impeach_entry";
        let msg = e.msg?.replace("M_onlyPm_", "");
        let qq = msg.replace(/[^0-9]/g, "");
        let query = `system=PC&version=2.0.1&uintype=1&eviluin=${qq}&appname=PCQQ&appid=2400001&scene=23000&subapp=c2c_pc&buddyflag=1&chatuin=1&srv_para=&cryptograph=712531AC4A3874B242774B95EEE8F6FE&apptype=1&ver=5905&pubno=27230`;
        url += "?" + query;
        let res = await fetch(url, {
            method: "get",
            headers: {
                Cookie: Bot.cookies['jubao.qq.com'],
            }
        })
        if (!res.ok) {
            e.reply("出错啦..");
            return true
        }
        res = await res.text()
        let info = await getQQInfo(qq);
        if (typeof info !== "undefined") {
            let msg = [];
            msg.push(`@${info.nickname}\nQQ：${qq}`);
            msg.push(segment.image(`${info.url}`));
            if (res.includes("帐号已封停")) {
                msg.push("该账号已封停");
            } else {
                msg.push("该账号正常");
            }
            e.reply(msg);
        } else {
            e.reply("请检查接口");
        }
        return true;
    }

    async resistance(e) {
        if (!fs.existsSync("./data/browserScreenShot/resistance/resistance.png") || e.msg?.includes("更新")) {
            let img = await browserPuppeteer.screenshot("resistance", {
                jumpUrl: 'https://wiki.biligame.com/ys/%E6%80%AA%E7%89%A9%E6%8A%97%E6%80%A7%E4%B8%80%E8%A7%88',
                saveName: 'resistance',
                selector: 'table',
                pageScript: () => {
                    let ele = document.querySelector(".wiki-nav");
                    ele.parentNode.removeChild(ele);
                }
            })
            if (!img) {
                e.reply("图片生成失败");
            } else {
                e.reply(img);
            }
            return true
        } else {
            e.reply(segment.image("./data/browserScreenShot/resistance/resistance.png"))
        }
    }

    async mysUserInfo(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        let key = msg.replace(/(#用户|#mysUser)/, "").trim()
        let uid = await getUserUid(key)
        if (!!!uid) {
            e.reply("未找到该用户");
            return true;
        }
        let img = await browserPuppeteer.screenshot("mysUserInfo", {
            jumpUrl: `https://www.miyoushe.com/ys/accountCenter/postList?id=${uid}`,
            saveName: 'mysUserinfo',
            selector: '.mhy-container'
        })
        if (!img) {
            e.reply("生成图片失败");
        } else {
            e.reply(img)
        }
        return true
    }

    async playerInfo(e) {
        let qq = e.user_id;
        let rs = await getQQInfo(qq);
        rs = rs[0];
        let avatar = rs.url;
        let nickname = rs.nick;
        let res = await playerGameInfo(qq);
        let img = await puppeteer.screenshot("playerInfo", {
            avatarUrl: avatar,
            tplFile: "./plugins/paimon-plugin/resources/html/playerInfo/playerInfo.html",
            saveId: qq,
            qq: qq,
            plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
            commonPath: `${_path}/plugins/paimon-plugin/resources/html/common`,
            nickname: nickname,
            games: res,
        })
        if (!img) {
            e.reply("查询失败");
            return true
        }
        let msg = [];
        if (e.isGroup) {
            msg.push(segment.at(e.user_id));
        }
        msg.push(img);
        e.reply(msg);
        return true;
    }
}

function toString() {
    let s = util.format.apply(null, arguments);
    return s;
}

function dfs(data, pos, num, cmd) {
    if (pos === num) {
        return data;
    }
    for (let key in data) {
        if (key === cmd[pos]) {
            return dfs(data[key], pos + 1, num, cmd);
        }
    }
    return undefined;
}

async function getQQInfo(id) {
    try {
        let url = `https://cgi.find.qq.com/qqfind/buddy/search_v3?keyword=${id}`;
        let res = await fetch(url, {
            method: 'get',
            headers: {
                Cookie: Bot.cookies["find.qq.com"]
            }
        });
        if (!res.ok) return
        res = await res.json()
        if (res.retcode !== 0) return
        let info = res?.result?.buddy?.info_list?.[0]
        if (!info) return
        return {nickname: info.nick, url: info.url}
    } catch (e) {
        Bot.logger.error(e)
    }
}

async function getUserUid(key) {
    let url = `https://bbs-api.mihoyo.com/apihub/wapi/search?gids=2&keyword=${key}&size=20`;
    let response = await fetch(url, {method: "get", headers: {"Referer": "https://bbs.mihoyo.com/"}});
    if (!response.ok) {
        return false;
    }
    response = await response.json();
    return response?.data?.users[0]?.uid
}

function deepDecode(b, deep, msg) {
    let o;
    try {
        o = core.pb.decode(b);
    } catch (e) {
        return null;
    }
    if (!o) return null;
    delete o["encoded"];
    for (let k of Object.keys(o)) {
        if (o[k] instanceof core.pb.Proto) {
            let obj = deepDecode(o[k]["encoded"], deep + 1, msg);
            if (obj) o[k] = obj;
            else {
                if ((deep + 1) % 5 === 0) {
                    if (msg[deep + 1]) msg[deep + 1].push(o[k])
                    else msg[deep + 1] = [o[k]]
                }
            }
        } else if (o[k] instanceof Array) {
            o[k] = decodeInArray(o[k], deep, msg);
        }
    }
    if (deep % 5 === 0) {
        if (msg[deep]) msg[deep].push(o)
        else msg[deep] = [o]
    }
    return o;
}

function myToStr(key, value) {
    if (value instanceof core.pb.Proto) {
        if (value.encoded) return value.encoded.toString();
        else return value;
    } else if (typeof value === "bigint") {
        return `BigInt(${value})`
    }
    return value;
}

function decodeInArray(arr, deep, msg) {
    let newArr = arr.map(a => {
        if (a instanceof core.pb.Proto) {
            return deepDecode(a.encoded, deep + 1, msg);
        } else if (a instanceof Array) {
            return decodeInArray(a, deep, msg)
        } else return a;
    });

    if (deep % 5 === 0) {
        if (msg[deep]) msg[deep].push(newArr)
        else msg[deep] = [newArr]
    }
    return newArr;
}
