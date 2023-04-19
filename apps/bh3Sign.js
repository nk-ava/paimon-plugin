import Plugin from "../../../lib/plugins/plugin.js";
import User from "../../genshin/model/mys/NoteUser.js";
import Bh3User from "../components/models/Bh3User.js";
import YAML from "yaml"
import fs from "node:fs"
import {Common} from "../components/index.js";
import bh3Api from "../components/models/Bh3Api.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import MysInfo from "../../genshin/model/mys/mysInfo.js";

const dMap = [null, "禁忌", "原罪I", "原罪II", "原罪III", "苦痛I", "苦痛II", "苦痛III", "红莲", "寂灭"]
const regions = ['hun01', 'hun02', 'android01', 'pc01', 'yyb01', 'bb01']

export class bh3Sign extends Plugin {
    constructor() {
        super({
            name: '崩坏三签到',
            dsc: "崩三每日签到",
            event: 'message',
            priority: 200,
            rule: [
                {
                    reg: '^(M_onlyPm_)?#绑定崩三',
                    fnc: 'bingBh',
                    event: "message.private"
                },
                {
                    reg: '^(M_onlyPm_)?#?我的(ck|cookie)$',
                    fnc: 'myCk',
                    event: 'message.private'
                },
                {
                    reg: '^(M_onlyPm_)?#(开启|关闭)崩三自动签到',
                    fnc: 'b3SignSwitch'
                },
                {
                    reg: '^(M_onlyPm_)?#崩坏三签到',
                    fnc: 'bh3Sign'
                },
                {
                    reg: '^(M_onlyPm_)?#?崩三(角色|\\d+)$',
                    fnc: 'bh3Info'
                },
                {
                    reg: '^(M_onlyPm_)?#?我的(uid|UID)$',
                    fnc: "showUid"
                }
            ]
        });
        this.task = {
            cron: "0 2 0 * * ?",
            name: "崩坏三签到任务",
            fnc: async () => {
                let num = Math.ceil(Math.random() * 30)
                Bot.logger.info(`崩坏三签到任务将在${num}分钟后执行`)
                setTimeout(async () => {
                    await this.b3SignTask.call(this);
                }, num * 60000)
            },
            log: false
        }
    }

    async b3SignTask() {
        logger.mark("开始崩坏三签到任务");
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
        logger.mark("崩坏三签到任务完成");
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
        let roles = await bh3Api.getAllRoles(ck);
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
        if (e.msg?.includes("开启")) {
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
        if (!ck) ck = await user.getCk();
        if (!role) role = await user.getMainRole();
        if (!ck) {
            e.reply("未绑定ck");
            return true;
        }
        if (!role) {
            e.reply("米游社未绑定游戏角色");
            return true;
        }
        if (await bh3Api.checkSigned(ck, role)) {
            e.reply("今日已签到");
            return true;
        }
        let msg = await bh3Api.bh3DaySign(ck, role);
        e.reply(msg);
        return true;
    }

    async bh3Info(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        let uid = msg.match(/\d+/)?.[0];
        let index, role, characters = [];
        if (uid) {
            await MysInfo.initCache();
            let mysInfo = new MysInfo(e);
            let queryUid;
            if (/^[6-9]/.test(uid)) {
                queryUid = (Number(uid[0]) - 5) + uid.substr(1);
            } else queryUid = uid;
            mysInfo.uid = queryUid;
            let ck = await mysInfo.getCookie();
            for (let region of regions) {
                role = {uid: uid, region: region};
                index = await bh3Api.getIndex(ck, role);
                if (typeof index !== "string") break;
            }
            if (typeof index === "string") {
                e.reply("没有找到对应的角色信息");
                return;
            }
            characters = await bh3Api.getCharacters(ck, role) || [];
        } else {
            let user = new Bh3User(e);
            let ck = await user.getCk();
            role = await user.getMainRole();
            if (!ck) {
                e.reply("未绑定ck");
                return true;
            }
            if (!role) {
                e.reply("米游社未绑定游戏角色");
                return true;
            }
            index = await bh3Api.getIndex(ck, role);
            if (typeof index === "string") {
                e.reply(index);
                return true;
            }
            characters = await bh3Api.getCharacters(ck, role) || [];
        }
        if (!index) {
            e.reply("出错了");
            return true;
        }
        let data = {
            nickname: index?.role?.nickname,
            level: index?.role?.level,
            uid: role.uid,
            index: [{
                key: "累计登舰",
                value: index?.stats?.['active_day_number'],
            }, {
                key: '收藏武器数',
                value: index?.stats?.['weapon_number'],
            }, {
                key: '装甲数',
                value: index?.stats?.['armor_number']
            }, {
                key: '记忆战场',
                value: (index?.stats?.['battle_field_ranking_percentage'] || "-") + "%"
            }, {
                key: '超弦空间',
                value: dMap?.[index?.stats?.['new_abyss']?.['level']]
            }, {
                key: '杯数',
                value: index?.stats?.['new_abyss']?.['cup_number']
            }, {
                key: '服装数',
                value: index?.stats?.['suit_number']
            }, {
                key: 'sss装甲数',
                value: index?.stats?.['sss_armor_number']
            }, {
                key: '收藏圣痕数',
                value: index?.stats?.['stigmata_number']
            }, {
                key: '往事乐土成绩',
                value: index?.stats?.['god_war_max_challenge_score']
            }, {
                key: '追忆之证数',
                value: index?.stats?.['god_war_extra_item_number']
            }, {
                key: '命定的歧路等级',
                value: index?.stats?.['god_war_max_support_point']
            }, {
                key: '五星武器数',
                value: index?.stats?.['five_star_weapon_number']
            }, {
                key: '五星圣痕数',
                value: index?.stats?.['five_star_stigmata_number']
            }],
            characters: characters
        }
        let img = await puppeteer.screenshot("bh3Index", {
            tplFile: "./plugins/paimon-plugin/resources/html/bh3Index/index.html",
            saveId: e.user_id,
            plusResPath: `${process.cwd()}/plugins/paimon-plugin/resources/html`,
            imgPath: `${process.cwd()}/plugins/paimon-plugin/resources/bh3`,
            data: data
        })
        if (img) e.reply(img);
        else e.reply("生成图片失败");
        return true;
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