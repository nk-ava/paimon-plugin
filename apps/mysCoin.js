import Plugin from "../../../lib/plugins/plugin.js";
import querystring from "querystring";
import artTemplate from "art-template";
import mysCKUser from "../components/models/mysCKUser.js";
import fs from "node:fs";
import YAML from "yaml";
import MysCKUser from "../components/models/mysCKUser.js";
import fetch from "node-fetch";
import {createSign, MysSign} from "../components/models/MysSign.js";
import {Common} from "../components/index.js";

const game_map = {
    "hk4e": "原神",
    "hkrpg": "崩坏：星穹铁道",
    "bh3": "崩坏3",
    "nxx": "未定事件簿",
    "bh2": "崩坏学园2",
    "bbs": "米游社"
}
const record = new Map
const template = fs.readFileSync("./plugins/paimon-plugin/resources/default_main.txt", "utf-8")

export class mysCoin extends Plugin {
    constructor(e) {
        super({
            name: '米游社',
            dsc: '对米游社的操作',
            event: 'message',
            priority: 200,
            rule: [
                {
                    reg: '^(M_onlyPm_)?#绑定米游社',
                    fnc: 'bingMys'
                },
                {
                    reg: '^(M_onlyPm_)?#?我的(ck|cookie)$',
                    fnc: 'myCk'
                },
                {
                    reg: '^(M_onlyPm_)?#米游社签到',
                    fnc: 'sign'
                },
                {
                    reg: '^(M_onlyPm_)?#*(开启|关闭)米游社自动签到$',
                    fnc: 'mysAuto'
                },
                {
                    reg: "^(M_onlyPm_)?#*(米游社|mys)兑换中心$",
                    fnc: "goodsList"
                },
                {
                    reg: "^(hk4e|hkrpg|bh3|nxx|bh2|bbs) \\d+$",
                    fnc: "getCodeFile",
                }
            ]
        });
        this.path = "./data/main_cache"
        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.path)
        }
        this.task = {
            cron: '0 0/5 * * * ?',
            name: '米游币每日获取',
            fnc: async () => {
                await this.taskSign.call(this)
            },
            log: false
        }
    }

    accept(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        if (!msg) return
        if (/login_ticket/.test(msg) && /login_uid/.test(msg)) {
            if (e.isGroup) {
                e.reply('请私聊发送');
                return true;
            }
            e.mysCk = msg;
            e.msg = '#绑定米游社';
            return true;
        }
    }

    async bingMys(e) {
        if (!e.isPrivate) return false;
        if (!e.mysCk) {
            e.reply("请输入米哈游cookie，如何获取米哈游cookie请查看https://csds.cds.com/dsdcv");
        } else {
            let ckJson = querystring.parse(e.mysCk, "; ", "=");
            if (!ckJson.login_ticket || !ckJson.login_uid || (!ckJson.cookie_token_v2 && !ckJson.cookie_token) || (!ckJson.account_id_v2 && !ckJson.account_id) || (!ckJson.account_mid_v2 && !ckJson.account_mid)) {
                e.reply("派蒙得到的cookie不完整(๑•́ωก̀๑),请重新复制");
                return true;
            }
            let uid = await getAllGameUid(e.mysCk);
            if (!!!uid) {
                e.reply("米游社ck未获取到uid");
                return true;
            }
            let stoken = await this.getStoken(ckJson.login_ticket, ckJson.login_uid);
            if (typeof stoken === "undefined") {
                e.reply("米游社login_ticket已失效，请登入https://user.mihoyo.com/#/login/captcha重新获取");
                return true;
            }
            let login_uid = ckJson.login_uid;
            let mysCk = `stuid=${login_uid}; stoken=${stoken};`
            let ck_bak = `login_ticket=${ckJson.login_ticket}; login_uid=${login_uid}; `
            if (ckJson.cookie_token) ck_bak += `cookie_token=${ckJson.cookie_token}; `
            if (ckJson.cookie_token_v2) ck_bak += `cookie_token_v2=${ckJson.cookie_token_v2}; `
            if (ckJson.account_id_v2) ck_bak += `account_id=${ckJson.account_id_v2}; `
            if (ckJson.account_id) ck_bak += `account_id=${ckJson.account_id}; `
            if (ckJson.account_mid_v2) ck_bak += `account_mid_v2=${ckJson.account_mid_v2}; `
            if (ckJson.account_mid) ck_bak += `account_mid_v2=${ckJson.account_mid}; `
            let user = new mysCKUser(e);
            user.mysCk = mysCk;
            user.gmUid = uid;
            user.ck_bak = ck_bak;
            let ltuid = mysCk.match(/stuid=\d+;/)[0];
            user.ltuid = ltuid.replace("stuid=", "").replace(";", "");
            let ret = user.bindMysCkUser();
            if (ret !== true) {
                e.reply(ret);
                return true;
            }
            e.reply("绑定米游社cookie成功\n【#米游社签到】完成米游社的每日米游币\n【#开启/关闭米游社自动签到】手动开启自动签到\n【#米游社兑换中心】获取米游币兑换商品信息");
            return true;
        }
        return true;
    }

    myCk(e) {
        if (e.isPrivate) {
            let user = new MysCKUser(e).creatUser();
            if (user.mysCk) e.reply(`米游社ck:\n${user.mysCk}`);
            else e.reply("未绑定米游社");
            return false;
        } else return false;
    }

    async getCodeFile(e) {
        if (!e.isPrivate) {
            e.reply("请私聊发送")
            return true
        }
        let goodsInfo = record.get(e.user_id)
        if (!goodsInfo) {
            e.reply("请先发送【#米游社兑换中心】获取商品信息")
            return true
        }
        if ((new Date()).toLocaleDateString() !== goodsInfo.time) {
            e.reply("商品信息已失效，请重新获取")
            record.delete(e.user_id)
            return true
        }
        let info = e.msg.split(" ")
        let game = info[0]
        let index = Number(info[1])
        if (isNaN(index)) {
            e.reply("下标错误，请输入整数")
            return true
        }
        let user = new MysCKUser(e).creatUser()
        let role = user.gmUid.filter(g => g.game_biz === `${game}_cn` && g.is_chosen)[0] || {}
        let goods = goodsInfo.data[game][index]
        if (!goods) {
            e.reply("未找到对应的商品信息，请查看数字是否对应")
            return true
        }
        let addr = await getAddress(user.ck_bak)
        if (!addr) {
            e.reply("获取收货地址失败，请前往米游社添加收货地址并将其设为默认地址")
            return true
        }
        let tip = []
        tip.push(`请核实以下信息：`)
        tip.push(`商品id：${goods.goods_id}`)
        tip.push(`商品名称：${goods.goods_name}`)
        tip.push(`兑换数量：1`)
        tip.push(`收货地址：${addr.province_name}${addr.city_name}${addr.county_name}${addr.addr_ext}`)
        if (goodsInfo.myb < goods.price) {
            tip.push("米游币不够，请在确保米游币充足的情况下执行")
        }
        if (!role.game_biz) {
            tip.push(`此账号没有绑定${game_map[game]}游戏角色，请确保符合相应的兑换条件再执行`)
        }
        tip = " * " + tip.join("\n * ")
        let d = new Date(goods.next_time * 1000)
        let data = {
            annotation: tip,
            cron: `${d.getSeconds()} ${d.getMinutes()} ${d.getHours()} ${d.getDate()} ${d.getMonth() + 1} ?`,
            ck: user.ck_bak,
            app_id: goods.app_id,
            point_sn: goods.point_sn,
            goods_id: goods.goods_id,
            uid: role.game_uid || "",
            region: role.region || "",
            game_biz: role.game_biz || "",
            address_id: addr.id
        }
        let tmp_file = `${this.path}/main_${Date.now()}.js`
        fs.writeFileSync(tmp_file, artTemplate.render(template, data), "utf-8")
        await e.friend.sendFile(tmp_file)
        fs.unlink(tmp_file, () => {
        })
    }

    async goodsList(e) {
        let ck = MysCKUser.getCkByUid(e.user_id).mysCK;
        if (!ck) {
            e.reply("请绑定米游社cookie");
            return true;
        }
        let reply_msg = []
        let t_record = {}
        let userI = await getPoints(ck)
        if (typeof userI === "string") {
            e.reply(userI)
            return true
        }
        reply_msg.push({
            user_id: Bot.uin,
            nickname: Bot.nickname,
            message: `米游币：${userI.total}\n今日已获得：${userI.sum}\n今日剩余：${userI.surplus}`
        })
        for (let v of Object.keys(game_map)) {
            let {goodsList, msg} = await getGoodsList(ck, v)
            t_record[v] = goodsList
            reply_msg.push({
                user_id: Bot.uin,
                nickname: Bot.nickname,
                message: msg
            })
        }
        record.set(e.user_id, {myb: userI.total, data: t_record, time: (new Date()).toLocaleDateString()})
        reply_msg.push({
            user_id: Bot.uin,
            nickname: Bot.nickname,
            message: "可以私聊发送例如【bh3 0】获取代码文件"
        })
        e.reply(await (e.friend || e.group).makeForwardMsg(reply_msg))
    }

    //通过米游社cookie获取stoken
    async getStoken(login_ticket, login_uid) {
        let url = "https://api-takumi.mihoyo.com/auth/api/getMultiTokenByLoginTicket";
        let query = `login_ticket=${login_ticket}&token_types=3&uid=${login_uid}`;
        let param = {
            method: "get",
        }
        let rep = await (await fetch(url + "?" + query, param)).json();
        if (rep.message === "OK") {
            return rep.data.list[0].token;
        } else return undefined;
    }

    async sign(e, flag = true, ck = null) {
        if (!ck) ck = MysCKUser.getCkByUid(e.user_id).mysCK;
        if (!ck) {
            e.reply("请绑定米游社cookie");
            return true;
        }
        if (flag) e.reply(`开始签到，请稍后...`);
        else logger.mark(`[${e.user_id}]：开始签到，请稍后...`);
        let ans = "";
        let t1 = (new Date).getTime();
        ans += await createSign(ck, 1, 1, true);
        ans += "\n---------------\n";
        ans += await createSign(ck, 26, 2, false);
        ans += `\n-----总用时${((new Date().getTime()) - t1) / 1000}s------`;
        e.reply(ans);
        return true;
    }

    async taskSign() {
        let t = await redis.get("Paimon:today-thumbUP");
        if (t !== "1") {
            await redis.set("Paimon:today-thumbUP", "1", {EX: Common.getDayEnd()});
            let st = Bot.fl;
            for (let [uid, info] of st) {
                if (uid !== Bot.uin) {
                    await Bot.pickFriend(Number(uid)).thumbUp(10);
                }
            }
            let usersCk = MysCKUser.getAllMysCK();
            for (let ck of usersCk) {
                if (ck.autoSign === false) continue;
                await this.sign({
                    user_id: ck.qq, reply: (msg) => {
                        Common.relpyPrivate(ck.qq, msg);
                    }
                }, false, ck.mysCK)
            }
        }
    }

    //#米游社自动签到
    mysAuto(e) {
        if (e.msg?.includes("开启")) {
            let ck = MysCKUser.getCkByUid(e.user_id);
            if (ck.autoSign === false) {
                ck.autoSign = true;
                let yaml = YAML.stringify(ck);
                fs.writeFileSync(`./data/ltUidCk/${e.user_id}.yaml`, yaml, "utf8");
            }
            e.reply("开启成功！！");
        } else {
            let ck = MysCKUser.getCkByUid(e.user_id);
            if (ck.autoSign === true) {
                ck.autoSign = false;
                let yaml = YAML.stringify(ck);
                fs.writeFileSync(`./data/ltUidCk/${e.user_id}.yaml`, yaml, "utf8");
            }
            e.reply("关闭成功！！");
        }
        return true;
    }
}

async function getAllGameUid(ck) {
    let res = await fetch('https://webapi.account.mihoyo.com/Api/get_ticket_by_loginticket', {
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': ck
        },
        body: 'action_type=game_role'
    });
    res = await res.json();
    if (res.code !== 200) return false;
    let action_ticket = res.data.ticket;
    res = await fetch(`https://api-takumi.mihoyo.com/binding/api/getUserGameRoles?action_ticket=${action_ticket}`, {
        method: 'get'
    });
    res = await res.json();
    return res?.data?.list;
}

async function getGoodsList(ck, game) {
    let res = await fetch(`https://api-takumi.miyoushe.com/mall/v1/web/goods/list?app_id=1&point_sn=myb&page_size=20&page=1&game=${game}`, {
        method: 'get',
        headers: {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Linux; Android 7.1.2; Lenovo TB-J606F Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Safari/537.36 miHoYoBBS/2.46.1",
            "Origin": "https://webstatic.miyoushe.com",
            "X-Requested-With": "com.mihoyo.hyperion",
            "Sec-Fetch-Site": "same-site",
            "Referer": "https://webstatic.miyoushe.com/app/community-shop/index.html?bbs_presentation_style=no_header",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cookie": ck
        }
    })
    if (!res.ok) {
        return "获取失败：请检查接口"
    }
    res = await res.json()
    let goodsList = res?.data?.list?.filter(l => {
        return l.unlimit || l.next_num !== 0
    })
    if (!goodsList) {
        return "获取失败：数据为空"
    }
    let msg = `----------------${game_map[game]}(${game})----------------`
    goodsList.forEach((goods, index) => {
        let time = goods.next_time
        let num = goods.next_num
        if (num === 0) num = "没有数量限制"
        if (time === 0) time = "没有兑换限制"
        else time = new Date(time * 1000).toLocaleDateString()
        msg += `\n【${index}】${goods.goods_name}(${goods.price}米游币)\n时间：${time}\n剩余：${num}`
    })
    return {goodsList, msg}
}

async function getPoints(ck) {
    let res = await fetch("https://bbs-api.miyoushe.com/apihub/sapi/getUserMissionsState", {
        method: 'get',
        headers: MysSign.getHeaders(ck)
    })
    if (!res.ok) {
        return "出错了：请检查接口"
    }
    res = await res.json()
    return {total: res?.data?.total_points, sum: res?.data?.today_total_points, surplus: res?.data?.can_get_points}
}

async function getAddress(ck) {
    let res = await fetch(`https://api-takumi.miyoushe.com/account/address/list?point_sn=myb`, {
        method: 'get',
        headers: {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Linux; Android 7.1.2; Lenovo TB-J606F Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Safari/537.36 miHoYoBBS/2.46.1",
            "Origin": "https://webstatic.miyoushe.com",
            "X-Requested-With": "com.mihoyo.hyperion",
            "Referer": "https://webstatic.miyoushe.com/app/community-shop/index.html?bbs_presentation_style=no_header",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cookie": ck
        }
    })
    if (!res.ok) return
    res = await res.json()
    return res?.data?.list?.filter(l => l.is_default === 1)[0]
}