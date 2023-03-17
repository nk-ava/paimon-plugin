import Plugin from "../../../lib/plugins/plugin.js";
import User from "../../genshin/model/mys/NoteUser.js";
import Bh3User from "../components/models/Bh3User.js";
import YAML from "yaml"
import fs from "node:fs"
import fetch from "node-fetch";
import lodash from "lodash";
import md5 from "md5";
import {Common} from "../components/index.js";

export class bh3Sign extends Plugin {
    constructor() {
        super({
            name: '崩坏三签到',
            dsc: "崩三每日签到",
            event: 'message',
            priority: 200,
            rule: [
                {
                    reg: '#绑定崩三',
                    fnc: 'bingBh',
                    event: "message.private"
                },
                {
                    reg: '^#?我的(ck|cookie)$',
                    fnc: 'myCk',
                    event: 'message.private'
                },
                {
                    reg: '#(开启|关闭)崩三自动签到',
                    fnc: 'b3SignSwitch'
                },
                {
                    reg: '#崩坏三签到',
                    fnc: 'bh3Sign'
                },
                {
                    reg: '^#?崩三\\d+$',
                    fnc: 'bh3Info'
                },
                {
                    reg: '^#?我的(uid|UID)$',
                    fnc: "showUid"
                }
            ]
        });
        this.task = {
            corn: "0 2 0 * * ?",
            name: "崩坏三签到任务",
            fnc: async () => {
                await this.b3SignTask.call(this);
            },
            log: false
        }
    }

    async b3SignTask() {
        let users = Bh3User.getAllUserInfo();
        for (let user of users) {
            if (!user.autoSign) continue;
            let ck = user.ck;
            let role = {
                uid: user.roles["game_uid"],
                region: user.roles.region
            };
            let e = {
                user_id: user.qq,
                reply: (msg) => {
                    Common.relpyPrivate(user.qq, msg);
                }
            }
            await this.bh3Sign(e, ck, role);
        }
    }

    async bingBh(e) {
        let user = new User(e.user_id);
        let bh3User = new Bh3User(e);
        if (!user.hasCk) {
            e.reply("请私聊发送cookie,与原神cookie相同")
            return true;
        }
        let ck = user.mainCk.ck;
        if (ck) bh3User.ck = ck;
        let roles = await getAllRoles(ck);
        if (!roles) {
            e.reply("绑定失败！为获取到任何角色信息");
            return true;
        }
        bh3User.Roles = roles;
        if (await bh3User.bingUser(ck)) {
            e.reply("绑定成功\n【#(开启|关闭)崩三自动签到】默认为开启\n【#崩坏三签到】崩三手动签到\n【#敬请期待】");
        } else {
            e.reply("绑定失败");
        }
        return true;
    }

    b3SignSwitch(e) {
        if (!fs.existsSync(`./data/bh3Ck/${e.user_id}.yaml`)) {
            e.reply("请私聊绑定cookie");
            return true;
        }
        if (e.msg.includes("开启")) {
            let info = YAML.parse(fs.readFileSync(`./data/bh3Ck/${e.user_id}.yaml`, "utf8"));
            if (!info.autoSign) {
                info.autoSign = true;
                fs.writeFileSync(`./data/bh3Ck/${e.user_id}.yaml`, YAML.stringify(info));
            }
            e.reply("开启成功");
        } else {
            let info = YAML.parse(fs.readFileSync(`./data/bh3Ck/${e.user_id}.yaml`, "utf8"));
            if (info.autoSign) {
                info.autoSign = false;
                fs.writeFileSync(`./data/bh3Ck/${e.user_id}.yaml`, YAML.stringify(info));
            }
            e.reply("关闭成功");
        }
    }

    async myCk(e) {
        e.reply("崩三UID：" + await (new Bh3User(e).getUid()));
        return false;
    }

    async bh3Sign(e, ck, role) {
        let user = new Bh3User(e);
        let url = "https://api-takumi.mihoyo.com/event/luna/sign";
        if (!role) role = await user.getMainRole();
        let body = {
            act_id: "e202207181446311",
            region: role.region,
            uid: role.uid,
            lang: "zh-cn"
        }
        let headers = getHeaders();
        headers["DS"] = getDsSign();
        if (!ck) ck = await user.getCk();
        headers["Cookie"] = ck;
        let res = await fetch(url, {
            method: 'post',
            headers: headers,
            body: JSON.stringify(body)
        })

        if (await checkSigned(ck, role)) {
            e.reply("今日已签到");
            return true;
        }
        if (!res.ok) {
            e.reply("米游社接口出错");
        } else {
            res = await res.json();
            if (res.retcode !== 0) {
                e.reply(res.message);
            } else {
                if (!(await checkSigned(ck, role))) {
                    e.reply("崩三今日签到失败，请手动过验证");
                } else {
                    e.reply("崩三今日签到成功");
                }
            }
        }
        return true;
    }

    async bh3Info(e) {
        let uid = e.msg.match(/\d+/)[0];
        console.log(uid);

    }

    async showUid(e) {
        let uid = await new Bh3User(e).getUid();
        if (uid) {
            e.reply("崩三绑定uid：" + uid);
        } else {
            e.reply("请绑定cookie后查看");
        }
        return false;
    }
}

async function getAllRoles(ck) {
    if (!ck) return false;
    let url = "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=bh3_cn"
    let headers = getHeaders();
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'get',
        headers: headers,
    });
    if (!res.ok) {
        return false;
    } else {
        res = await res.json();
        return res?.data?.list;
    }
}

function getHeaders() {
    return {
        "Host": "api-takumi.mihoyo.com",
        "Connection": "keep-alive",
        "Accept": "application/json, text/plain, */*",
        'x-rpc-app_version': '2.37.1',
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; HLK-AL10 Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/537.36 miHoYoBBS/2.46.1',
        'x-rpc-client_type': 5,
        'x-rpc-device_id': '8642b132-87b3-30b3-a4e7-361e487e568b',
        'Origin': 'https://webstatic.mihoyo.com',
        'X-Requested-With': 'com.mihoyo.hyperion',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://webstatic.mihoyo.com/bbs/event/signin/bh3/index.html?bbs_auth_required=true&act_id=e202207181446311&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    }
}

function getDsSign() {
    const n = 'Qqx8cyv7kuyD8fTw11SmvXSFHp7iZD29'
    const t = Math.round(new Date().getTime() / 1000)
    const r = lodash.sampleSize('abcdefghijklmnopqrstuvwxyz0123456789', 6).join('')
    const DS = md5(`salt=${n}&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
}

async function checkSigned(ck, role) {
    let url = `https://api-takumi.mihoyo.com/event/luna/info?act_id=e202207181446311&region=${role.region}&uid=${role.uid}&lang=zh-cn`;
    let headers = getHeaders();
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'get',
        headers: headers
    });
    if (!res.ok) {
        return false;
    } else {
        res = await res.json();
        return res?.data?.["is_sign"];
    }
}