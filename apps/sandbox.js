import Plugin from "../../../lib/plugins/plugin.js";
import {init, restart, close, dealMsg, saveCtx} from "../components/models/sandbox/index.js";
import fs from "node:fs";
let sbStata = {on: false}

//记录回复
global.resMap = new Map

export class sandbox extends Plugin {
    constructor(e) {
        super({
            name: '沙盒',
            desc: '运行代码环境',
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: "^(M_onlyPm_)?#?sandbox[-_:](on|off)$",
                    fnc: 'cmdSwitch'
                },
                {
                    reg: '^(M_onlyPm_)?%([\\s\\S]*)$',
                    fnc: 'command'
                },
                {
                    reg: '^(M_onlyPm_)?#?sandbox[-_:]save$',
                    fnc: "tempSave",
                    permission: "master"
                },
                {
                    reg: "^(M_onlyPm_)?#?sandbox[-_:]restart$",
                    fnc: 'sbRestart',
                    permission: "master"
                }
            ]
        });
    }

    async accept(e) {
        if (sbStata.on) {
            let data = JSON.parse(JSON.stringify(e, (k, v) => {
                if (['runtime', 'user', 'original_msg', 'msg', 'logText', 'replyNew', 'reply', 'game', 'isSr'].includes(k)) {
                    return
                }
                return v
            }))
            dealMsg.call(Bot, data)
            let res = await new Promise((resolve) => {
                resMap.set(data['message_id'], resolve)
            })
            if (!res) return false;
            else {
                if (res[0]?.type === 'text' && res[0]?.text?.startsWith("%")) {
                    e.msg = res[0]?.text
                    return false;
                }
                e.reply(res)
                return true;
            }
        }
    }

    //执行代码
    async command(e) {
        if (commanding) return true
        if (e.isMaster) {
            global.ev = e;
            let msg = e.msg.replace("M_onlyPm_", "");
            let cmd = msg.substr(1, e.length);
            let str = cmd.split("import");
            let upload = "import md5 from 'md5';\nimport fetch from 'node-fetch';\nimport fs from 'fs';\n";
            let len = str.length;
            if (len !== 1) {
                let ss = str[len - 1].split('\n', 1);
                cmd = str[len - 1].replace(ss, "");
                str[len - 1] = ss;
                for (let i = 1; i < len; i++) {
                    upload += "import" + str[i];
                }
            }
            let before = "\ntry{";
            let after = "\nBot.logger.mark('命令执行成功');}catch(e){ev.reply(e.toString());}";
            let m = upload + before + cmd + after;
            fs.writeFileSync("./plugins/paimon-plugin/components/models/code.js", m);
        } else {
            // e.reply("派蒙只听主人的( •̥́ ˍ •̀ू )")
            return false
        }
    }

    //命令模式开关
    cmdSwitch(e) {
        if (!e.isMaster) {
            return true;
        }
        let msg = e.msg.replace("M_onlyPm_", "");
        if (msg.includes("on")) {
            if (!sbStata.on) {
                sbStata.on = true;
                init(Bot)
            }
            e.reply("Paimon-Bot online");
        } else {
            if (sbStata.on) {
                sbStata.on = false;
                close(Bot)
            }
            e.reply("Paimon-bot offline");
        }
        return true;
    }

    tempSave(e) {
        if (!e.isMaster) return true;
        if (!sbStata.on) {
            e.reply("未开启sandbox");
            return true;
        }
        saveCtx();
        e.reply("保存成功")
    }

    sbRestart(e) {
        if (!e.isMaster) return true
        sbStata.on = false
        restart();
        e.reply("Paimon_Bot restarted")
    }
}