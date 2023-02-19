import Plugin from "../../../lib/plugins/plugin.js";
import querystring from "querystring";
import mysCKUser from "../components/models/mysCKUser.js";
import fs from "node:fs";
import YAML from "yaml";
import MysCKUser from "../components/models/mysCKUser.js";
import {createSign} from "../components/models/MysSign.js";
import {Common} from "../components/index.js";

export class mysCoin extends Plugin {
    constructor(e) {
        super({
            name: '米游社',
            dsc: '对米游社的操作',
            event: 'message',
            priority: 200,
            rule: [
                {
                    reg: '#绑定米游社',
                    fnc: 'bingMys'
                },
                {
                    reg: '^#?我的(ck|cookie)$',
                    fnc: 'myCk'
                },
                {
                    reg: '#米游社签到',
                    fnc: 'sign'
                },
                {
                    reg: '^#*(开启|关闭)米游社自动签到$',
                    fnc: 'mysAuto'
                },
                {
                    reg:'taskTest',
                    fnc:'taskSign'
                }
            ]
        });
        this.task = {
            cron: '0 5 0 * * ?',
            name: '米游币每日获取',
            fnc: this.taskSign,
            log: false
        }
    }

    accept(e) {
        if (!e.msg) return
        if (/login_ticket/.test(e.msg) && /login_uid/.test(e.msg)) {
            if (e.isGroup) {
                e.reply('请私聊发送');
                return true;
            }
            e.mysCk = e.msg;
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
            if (!ckJson.login_ticket || !ckJson.login_uid) {
                e.reply("派蒙得到的cookie不完整(๑•́ωก̀๑),请重新复制");
                return true;
            }
            let stoken = await this.getStoken(ckJson.login_ticket, ckJson.login_uid);
            if (typeof stoken === "undefined") {
                e.reply("米游社login_ticket已失效，请登入https://user.mihoyo.com/#/login/captcha重新获取");
                return true;
            }
            let login_uid = ckJson.login_uid;
            let mysCk = `stuid=${login_uid};stoken=${stoken};`;

            let user = new mysCKUser(e);
            user.mysCk = mysCk;
            let uid = mysCk.match(/stuid=\d+;/)[0];
            user.ltuid = uid.replace("stuid=", "").replace(";", "");
            let ret = user.bindMysCkUser();
            if (ret !== true) {
                e.reply(ret);
                return true;
            }
            e.reply("绑定米游社cookie成功\n【#米游社签到】完成米游社的每日米游币\n【#开启/关闭米游社自动签到】可以手动开启自动签到");
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
        if (t != "1") {
            await redis.set("Paimon:today-thumbUP", "1", {EX: Common.getDayEnd()});
            let st = Bot.fl;
            for (let s of Object.keys(st)) {
                if (s != Bot.uin) {
                    await Bot.pickFriend(Number(s)).thumbUp(10);
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
        if (e.msg.includes("开启")) {
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