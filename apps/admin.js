import Plugin from "../../../lib/plugins/plugin.js"
import {Cfg} from "../components/index.js"

export class admin extends Plugin {
    constructor(e) {
        super({
            name: "管理",
            dsc: '仅管理员使用',
            event: 'message',
            priority: '50',
            rule: [
                {
                    reg: '#(启用|禁用)群游戏',
                    fnc: "banGm",
                    permission: "master"
                },
                {
                    reg: '#派蒙(强制)?更新',
                    fnc: "update",
                    permission: "master"
                }
            ]
        });
    }

    async banGm(e) {
        if (!e.isGroup) {
            e.reply("请在群里发此命令，即可确定禁用的群")
            return true
        }
        if (e.msg.includes("禁用")) {
            let cfg = Cfg.get("banGm");
            if (!(cfg?.ban)) {
                Cfg.set("banGm", {ban: [e.group_id]})
            } else {
                if (!cfg.ban.includes(e.group_id)) {
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
    }

    async update(e) {
        let msg = e.msg.replace("派蒙", "");
        msg += "paimon-plugin";
        e.msg = msg;
    }
}