import {segment} from "oicq";
import Plugin from "../../../lib/plugins/plugin.js";
import GmDao from "../components/models/GameDate.js";
import {gmErrorMsg} from "../components/models/GameDate.js";
import {Cfg} from "../components/index.js";

let isCfg = {}, isStart = {};
let groupCfg = {};
let ans = {};
let low = {}, high = {};

export class digitalBomb extends Plugin {
    constructor(e) {
        super({
            name: '数字炸弹',
            dsc: '派蒙插件游戏1',
            event: 'message',
            priority: 50,
            rule: [{
                reg: "#数字炸弹",
                fnc: 'gameName'
            }, {
                reg: "#结束游戏",
                fnc: "gameOver"
            }]
        });
    }

    async accept(e) {
        if (e.toString().includes("结束游戏")) {
            return this.gameOver(e)
        }
        if (!this.cfgGame(e)) {
            return await this.getNum(e)
        }
    }

    gameName(e, flag = true) {
        if (Cfg.get("banGm")?.ban?.includes(e.group_id)) return true;
        if (!e.isGroup) {
            e.reply("这个游戏只能在群里玩");
            return true;
        }
        if (!isPmPlaying[e.group_id]) {
            isPmPlaying[e.group_id] = 1;
            let msg1 = "游戏规则：\n在一个数字范围内，有一个数字作为炸弹，谁猜中这个炸弹就被惩罚.比如范围是1~99，炸弹是60，然后猜了一个数字是30，30不是炸"
                + "弹，那么猜数字的范围就缩小到30~100。(开启后会屏蔽一切命令，【#结束游戏】可结束正在进行的游戏";
            groupCfg[e.group_id] = {};
            groupCfg[e.group_id].joinPerson = [];
            groupCfg[e.group_id].joinPerson.push(e.user_id);
            let msg2 = [segment.at(e.user_id), " 请输入炸弹范围：例：0,99\n", "请@群成员确定参与人员(注：不要@自己，自己默认为参与人员)"];
            if (flag) e.reply(msg1);
            e.reply(msg2);
            isCfg[e.group_id] = true;
        } else {
            e.reply(gmErrorMsg(e))
        }
        return true;
    }

    gameOver(e, flag = true) {
        if (isPmPlaying[e.group_id] === 1) {
            delete isPmPlaying[e.group_id];
            delete groupCfg[e.group_id];
            isStart[e.group_id] = false;
            isCfg[e.group_id] = false;
            if (flag) e.reply("数字炸弹已结束");
            return true;
        }
        return false;
    }

    async getNum(e) {
        if (!isStart[e.group_id]) return false;
        let ns = groupCfg[e.group_id].cnt;
        let number;
        if (e.user_id === groupCfg[e.group_id].joinPerson[ns]) {
            try {
                number = e.msg.replace(/[^\d]/g, "");
            } catch (err) {
                e.reply("请输入数字");
                return true;
            }
            if (number * 1 <= low[e.group_id] * 1 || number * 1 >= high[e.group_id] * 1) {
                e.reply("请看清数字范围再输入");
                return true;
            }
            if (number * 1 === ans[e.group_id] * 1) {
                let msg = [segment.at(e.user_id), ` 恭喜你猜中了炸弹，本次炸弹是：${ans[e.group_id]}`];
                e.reply(msg);
                let list = groupCfg[e.group_id].joinPerson;
                for (let i in list) {
                    let sum = await GmDao.getCnt(1, "sum", list[i]);
                    sum = sum * 1 + 1;
                    await GmDao.updateCnt(1, "sum", list[i], sum + '');
                }
                let rate = await GmDao.getCnt(1, "win", e.user_id);
                rate = rate * 1 + 1;
                await GmDao.updateCnt(1, "win", e.user_id, rate);
                isStart[e.group_id] = false;
                this.gameOver(e, false);
                this.gameName(e, false);
                return true;
            } else if (number * 1 > ans[e.group_id] * 1) {
                high[e.group_id] = number;
            } else {
                low[e.group_id] = number;
            }
            ns = groupCfg[e.group_id].cnt = (groupCfg[e.group_id].cnt + 1) % groupCfg[e.group_id].pers;
            let msg = [segment.at(groupCfg[e.group_id].joinPerson[ns]), " 请在" + low[e.group_id] + "~" + high[e.group_id] + "之间猜一个数"];
            e.reply(msg);
        } else return false;
    }

    cfgGame(e) {
        if (!isCfg[e.group_id]) return false;
        if (groupCfg[e.group_id].joinPerson[0] === e.user_id) {
            let reg = /\d,\d/;
            let s = "";
            if (reg.test(e.msg)) {
                let mss = e.message;
                for (let i in mss) {
                    if (mss[i].type === "text") s += mss[i].text;
                    else if (mss[i].type === "at") {
                        let arr = groupCfg[e.group_id].joinPerson;
                        if (arr.indexOf(mss[i].qq) === -1) arr.push(mss[i].qq);
                    }
                }
                s = s.split(",");
            } else {
                e.reply("未正确输入，请按规则输入");
                return true;
            }
            low[e.group_id] = s[0].replace(/[^\d]/g, "");
            high[e.group_id] = s[1].replace(/[^\d]/g, "");
            if (low[e.group_id] * 1 >= high[e.group_id] * 1 || high[e.group_id] * 1 - low[e.group_id] * 1 === 1) {
                e.reply("数字定义不合规则，请重新输入");
                return true;
            }
            groupCfg[e.group_id].pers = groupCfg[e.group_id].joinPerson.length;
            if (groupCfg[e.group_id].pers <= 1) {
                e.reply("至少两个人参与");
                return true;
            }
            e.reply("游戏开始\n参与人数：" + groupCfg[e.group_id].pers);
            groupCfg[e.group_id].cnt = 0;
            ans[e.group_id] = Math.floor(Math.random() * (high[e.group_id] * 1.0 - 1.0 - low[e.group_id] * 1.0) + low[e.group_id] * 1.0 + 1.0);
            let ns = groupCfg[e.group_id].cnt;
            let msg = [segment.at(groupCfg[e.group_id].joinPerson[ns]), " 请在" + low[e.group_id] + "~" + high[e.group_id] + "之间猜一个数"];
            e.reply(msg);
            isCfg[e.group_id] = false;
            isStart[e.group_id] = true;
            return true;
        } else return false;
    }
}