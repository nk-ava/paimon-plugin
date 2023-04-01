import Plugin from "../../../lib/plugins/plugin.js"
import {Cfg} from "../components/index.js"

export class other extends Plugin {
    constructor() {
        super({
            name: '其他',
            dsc: '派蒙插件的其他',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: '(M_onlyPm_)?#?only[-_:]Paimon[-_:](on|off)',
                    fnc: 'switchOnly',
                    permission: 'master'
                }
            ]
        });
        this.cfg = Cfg.get("other") || {}
    }

    accept(e) {
        if (!e.isGroup) return;
        if (this.cfg?.qun?.includes(e.group_id)) {
            if (e.atme) return;
            e.msg = "M_onlyPm_" + e.msg;
        }
    }

    switchOnly(e) {
        let msg = e.msg.replace("M_onlyPm_", "");
        if (!(this.cfg.qun)) {
            this.cfg.qun = []
        }
        let st = msg.split(/[-_:]/)?.[2];
        if (st === "on") {
            let qun = this.cfg.qun;
            if (qun.indexOf(e.group_id) === -1) {
                qun.push(e.group_id)
                Cfg.set("other", this.cfg)
            }
            e.reply("ret：1");
        } else {
            let qun = this.cfg.qun;
            let index = qun.indexOf(e.group_id);
            if (index !== -1) {
                qun.splice(index, 1);
                Cfg.set("other", this.cfg)
            }
            e.reply("ret：1");
        }
    }
}