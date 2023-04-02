import Plugin from "../../../lib/plugins/plugin.js"
import {Cfg} from "../components/index.js"

export class admin extends Plugin {
    constructor(e) {
        super({
            name: "管理",
            dsc: '仅管理员使用',
            event: 'message',
            priority: '49',
            rule: [
                {
                    reg: '(M_onlyPm_)?#(启用|禁用)群游戏',
                    fnc: "banGm",
                    permission: "master"
                },
                {
                    reg: '(M_onlyPm_)?#派蒙(强制)?更新',
                    fnc: "update",
                    permission: "master"
                },
                {
                    reg: '(M_onlyPm_)?#(开启|关闭)群打卡\d*',
                    fnc: 'qunCard',
                    permission: "master"
                },
                {
                    reg: '(M_onlyPm_)?#关闭全部群打卡',
                    fnc: 'closeAll',
                    permission: "master"
                },
                {
                    reg: '(M_onlyPm_)?#打卡',
                    fnc: 'card',
                    permission: "master"
                }
            ]
        });

        this.task = {
            cron: '0 0 0 * * ?',
            name: '群打卡',
            fnc: async () => {
                await this.qunSign()
            },
            log: false
        }
    }

    closeAll(e) {
        let cfg = Cfg.get("qunSign");
        if (cfg?.qun) {
            cfg.qun = []
            Cfg.set("qunSign", cfg)
        }
    }

    async card(e) {
        if (!e.isGroup) {
            return true;
        }
        await this.qunSign(e.group_id);
    }

    async qunSign(qun) {
        let cfg = []
        if (qun) {
            cfg = [qun]
        } else {
            cfg = Cfg.get("qunSign")?.qun || [];
        }
        let error = [];
        for (let gid of cfg) {
            let body = core.pb.encode({
                2: {
                    1: String(Bot.uin),
                    2: String(gid),
                    3: Bot.apk.ver
                }
            })
            let res = await Bot.sendOidb("OidbSvc.0xeb7_1", body);
            res = core.pb.decode(res);
            if ((res[3] & 0xffffffff) !== 0) {
                error.push(gid)
            }
        }
        if (!qun) {
            for (let gid of error) {
                let index = cfg.indexOf(gid);
                cfg.splice(index, 1)
            }
            Cfg.set("qunSign", {qun: cfg});
        }
    }

    qunCard(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        let gid = msg.match(/\d+/)?.[0];
        if (!gid && !e.isGroup) {
            e.reply("请在群里发送");
            return true;
        }
        if (gid) {
            e.group_id = Number(gid)
        }
        let cfg = Cfg.get("qunSign") || {}
        if (msg.includes("开启")) {
            if (!cfg?.qun?.includes(e.group_id)) {
                let qun = cfg?.qun || []
                qun.push(e.group_id);
                cfg.qun = qun;
                Cfg.set("qunSign", cfg)
            }
            e.reply("success");
        } else {
            if (cfg?.qun?.includes(e.group_id)) {
                let index = cfg.qun.indexOf(e.group_id);
                cfg.qun.splice(index, 1);
                Cfg.set("qunSign", cfg);
            }
            e.reply("success");
        }
        return true;
    }

    async banGm(e) {
        if (!e.isGroup) {
            e.reply("请在群里发此命令，即可确定禁用的群")
            return true
        }
        if (e.msg?.includes("禁用")) {
            e.msg = "#结束游戏"
            let cfg = Cfg.get("banGm");
            if (!(cfg?.ban)) {
                Cfg.set("banGm", {ban: [e.group_id]})
            } else {
                if (!cfg.ban?.includes(e.group_id)) {
                    cfg.ban.push(e.group_id);
                    Cfg.set("banGm", cfg);
                }
            }
            e.reply("禁用成功")
        } else {
            let cfg = Cfg.get("banGm");
            if (cfg?.ban) {
                let index = cfg.ban.indexOf(e.group_id);
                cfg.ban.splice(index, 1);
                Cfg.set("banGm", cfg)
            }
            e.reply("启用成功")
        }
        return false;
    }

    async update(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        msg = msg.replace("派蒙", "");
        msg += "paimon-plugin";
        e.msg = msg;
        return false
    }
}