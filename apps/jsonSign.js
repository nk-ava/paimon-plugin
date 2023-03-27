import Plugin from "../../../lib/plugins/plugin.js";
import md5 from "md5";

export class jsonSign extends Plugin {
    constructor(e) {
        super({
            name: 'JSON生成器',
            dsc: '构造json消息',
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: '^#\\{([\\s\\S]*)\\}$',
                    fnc: 'send'
                }
            ]
        });
    }

    static async sendJson(uid, type, data) {
        let body = buildBody(uid, type, data);
        await Bot.sendOidb("OidbSvc.0xb77_9", core.pb.encode(body));
    }

    async send(e) {
        let msg = String.raw`${e.toString()}`
        msg = msg.substr(1, msg.length);
        try {
            let body = JSON.parse(msg);
            if (body["extra"]) delete body["extra"];
            if (!(body?.config?.token)) {
                if(!body["config"]) body["config"] = {};
                if(!body.config.token) body.config.token = md5(new Date().getTime());
            }
            let send_id, type;
            if (e.isGroup) {
                send_id = e.group_id;
                type = 1;
            } else {
                send_id = e.user_id;
                type = 0;
            }
            await jsonSign.sendJson(send_id, type, body);
            return false;
        } catch (err) {
            return false;
        }
    }
}

function buildBody(target, send_type, json_data) {
    let appid = 100951776
    let style = 10
    let appname = "tv.danmaku.bili"
    let appsign = "7194d531cbe7960a22007b9f6bdaa38b"

    return {
        1: appid,
        2: 1,
        3: style,
        5: {
            1: 1,
            2: "0.0.0",
            3: appname,
            4: appsign,
        },
        7: {
            15: BigInt(`${new Date().getTime()}${Math.floor(Math.random() * 900 + 100)}`), //msg_seq
        },
        10: send_type, //0是私聊，1是群聊
        11: target,
        18: {
            1: 1109937557,
            2: {
                14: 'pages',
            },
            3: 'url',
            4: 'text',
            5: 'text',
            6: 'text',
            10: JSON.stringify(json_data),
        }
    }
}
