import Plugin from "../../../lib/plugins/plugin.js";
import fs from "node:fs";
import {segment, core} from "oicq";
import util from "util";
import common from "../../../lib/common/common.js";
import request from "request";
import browserPuppeteer from "../components/models/BrowserPuppeteer.js";
import {playerGameInfo} from "../components/models/GameDate.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";

const _path = process.cwd()

export class example extends Plugin {
    constructor(e) {
        super({
            name: 'PM插件',
            dsc: 'js插件',
            event: 'message',
            priority: 100,
            rule: [
                {
                    reg: '^#paimon Test$',
                    fnc: 'test'
                },
                {
                    reg: '#?赞我',
                    fnc: 'userThumbUp'
                },
                {
                    reg: '^\\.(.*)$|^#getMessage$',
                    fnc: 'getMessage'
                },
                {
                    reg: '封号\\[(.*)\\]$',
                    fnc: 'killQQ'
                },
                {
                    reg: '#*(更新)?怪物抗性',
                    fnc: 'resistance'
                },
                {
                    reg: '^(#用户|#mysUser)\\s(.*)',
                    fnc: "mysUserInfo"
                },
                {
                    reg: '#游戏胜率',
                    fnc: 'playerInfo'
                },
                {
                    reg: "pb解码",
                    fnc: 'pbDecode'
                }
            ]
        });
    }

    test() {
        this.e.reply("发送消息成功！！");
    }

    async pbDecode(e) {
        let str = e.msg.replace(/pb解码\s?/, "");
        let arr = str.split(/[\s\n]/).filter(a => a && a.trim()).map(a => {
            return Number('0x' + a)
        });
        let body = Buffer.from(arr);
        body = body.slice(4)
        try {
            let msg = []
            let decodeMsg = []
            let decoded = deepDecode(body, 1, decodeMsg);
            msg.push(toString(decoded));
            for (let i = decodeMsg.length - 1; i >= 0; i--) {
                msg.push(toString(decodeMsg[i]));
            }
            msg.push("buffer转string后消息：")
            msg.push(JSON.stringify(decoded, myToStr, "  "));
            e.reply(await common.makeForwardMsg(e, msg, "点击查看解码结果"));
        } catch (err) {
            e.reply("出错了：" + err.toString());
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
            e.reply("请引用消息后再使用此命令");
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
        if (e.msg[0] === "#") {
            e.reply(mss.toString());
            return true;
        }
        let cmd = e.msg.split(/\.|\[|\]/g);
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
        let qq = e.msg.replace(/[^0-9]/g, "");
        let query = `system=PC&version=2.0.1&uintype=1&eviluin=${qq}&appname=PCQQ&appid=2400001&scene=23000&subapp=c2c_pc&buddyflag=1&chatuin=1&srv_para=&cryptograph=712531AC4A3874B242774B95EEE8F6FE&apptype=1&ver=5905&pubno=27230`;
        url += "?" + query;
        request({
            url: url,
            method: "get",
            headers: {
                Cookie: 'RK=65ZAGnnu0Z; ptcz=a62fba438c651996785c8fb18056297847e29dfc3fdc15956107de475725786b; pgv_pvid=2019795700; tvfe_boss_uuid=9469d5de17df26f1; o_cookie=3530766280; pac_uid=1_3530766280; iip=0; tgw_l7_route=7b7b98fff9859a4373d0e94a692332e0; luin=o3530766280; lskey=000100001e19a0e12d9cbffb15c87d925e7023c77bb98d270e395e7dfc9cd08fe56e862c8a49fc737c88041e; p_luin=o3530766280; p_lskey=000400003c712529f22969da120084def6f3d3afad52650db828601bba7a1206dca3f0beb4b49f791fbc4b2b',
            }
        }, async (err, rep, body) => {
            if (err) {
                e.reply("出错啦..");
                Bot.logger.error(err);
            } else {
                let info = await getQQInfo(qq);
                if (typeof info != "undefined") {
                    let msg = [];
                    msg.push(`@${info[0].nick}\nQQ：${qq}`);
                    msg.push(segment.image(`${info[0].url}`));
                    if (body.includes("帐号已封停")) {
                        msg.push("该账号已封停");
                    } else {
                        msg.push("该账号正常");
                    }
                    e.reply(msg);
                } else {
                    e.reply("请检查接口");
                }
            }
        });
        return true;
    }

    async resistance(e) {
        if (!fs.existsSync("./data/browserScreenShot/resistance/resistance.png") || e.msg.includes("更新")) {
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
        let key = e.msg.replace(/(#用户|#mysUser)/, "").trim()
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
    let domain = "";
    let cookie = Bot.cookies[domain];
    let bkn = Bot.bkn;
    let url = `https://find.qq.com/proxy/domain/cgi.find.qq.com/qqfind/find_v11?backver=2&keyword=${id}&nf=0&of=0&ldw=${bkn}`;
    let data = `bnum=15&pagesize=15&id=0&sid=0&page=0&pageindex=0&ext=&guagua=1&gnum=12&guaguan=2&type=2&ver=4903&longitude=116.405285&latitude=39.904989&lbs_addr_country=%E4%B8%AD%E5%9B%BD&lbs_addr_province=%E5%8C%97%E4%BA%AC&lbs_addr_city=%E5%8C%97%E4%BA%AC%E5%B8%82`;
    //data = querystring.parse(data);
    let param = {
        headers: {
            Cookie: cookie,
        },
        method: "post",
        body: data,
    }
    let res = await (await fetch(url, param)).json();
    if (res.retcode === 0) {
        return res.result.buddy.info_list;
    }
    return undefined;
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
    let flag = false;
    for (let k of Object.keys(o)) {
        if (deep >= 3 && typeof o[k] === "object") {
            deep = 1;
            flag = true;
        }
        if (o[k] instanceof core.pb.Proto) {
            let obj = deepDecode(o[k]["encoded"], deep + 1, msg);
            if (obj) o[k] = obj;
        } else if (o[k] instanceof Array) {
            o[k] = decodeInArray(o[k], deep + 1, msg);
        }
    }
    if (flag) msg.push(o);
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
    let flag = false;
    let newArr = arr.map(a => {
        if (deep >= 3 && typeof a === "object") {
            deep = 1;
            flag = true;
        }
        if (a instanceof core.pb.Proto) {
            return deepDecode(a.encoded, deep + 1, msg);
        } else if (a instanceof Array) {
            return decodeInArray(a, deep + 1, msg)
        } else return a;
    });

    if (flag) msg.push(newArr);
    return newArr;
}