import Plugin from "../../../lib/plugins/plugin.js";
import md5 from "md5";
import fetch from "node-fetch";
import querystring from "querystring";
import {Cfg} from "../components/index.js";

let map = {
    "0": "zh",         // 中文
    "1": "en",         // 英语
    "2": "yue",        // 粤语
    "3": "wyw",        // 文言文
    "4": "jp",         // 日语
    "5": "kor",        // 韩语
    "6": "fra",        // 法语
    "7": "spa",        // 西班牙语
    "8": "th",         // 泰语
    "9": "ara",        // 阿拉伯语
    "10": "ru",        // 俄语
    "11": "pt",        // 葡萄牙语
}

let ttsUrl = ""

export class translate extends Plugin {
    constructor(e) {
        super({
            name: 'PM翻译',
            dsc: '来自百度翻译',
            event: 'message',
            priority: 100,
            rule: [
                {
                    reg: '^(M_onlyPm_)?#*(tts)?翻译(0|1|2|3|4|5|6|7|8|9|10|11)?,?(0|1|2|3|4|5|6|7|8|9|10|11)? ([\\s\\S]*)',
                    fnc: 'translate'
                },
                {
                    reg: '^(M_onlyPm_)?#*翻译帮助',
                    fnc: 'transHelp'
                },
                {
                    reg: '^(M_onlyPm_)?#*配置翻译',
                    fnc: "cfgTrans"
                },
                {
                    reg: '^(M_onlyPm_)?#*删除翻译配置',
                    fnc: "delCfg"
                },
                {
                    reg: '^(M_onlyPm_)?#?tts',
                    fnc: 'toTTS'
                }
            ]
        });
        this.reloadCfg();
    }

    accept(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        if (/appId=(.*);secret_key=(.*)/.test(msg)) {
            e.cfgTrans = msg;
            e.msg = "#配置翻译"
        }
    }

    // node版本太高可能会发不出去，建议v16.16
    toTTS(e) {
        if (!ttsUrl) {
            e.reply("请先使用翻译")
            return
        }
        let params = querystring.parse(ttsUrl.substr(31))
        if (params['lan'] === "auto") {
            e.reply('tts不支持自动识别的语言，请使用参数指定翻译的语言类型')
            return
        }
        e.reply({
            type: 'record',
            file: ttsUrl
        })
    }

    reloadCfg() {
        this.appid = Cfg.get("translate")?.appId;
        this.secret_key = Cfg.get("translate")?.secret_key;
    }

    async translate(e) {
        if (!this.appid || !this.secret_key) {
            e.reply("未配置百度翻译，请私聊发送【#配置翻译】配置")
            return true
        }
        let from = "auto", to = "auto", q;
        if (e.source) {
            let t = e.friend || e.group;
            let mss;
            if (e.isPrivate) mss = await t.getChatHistory(e.source.time, 1);
            else mss = await t.getChatHistory(e.source.seq, 1);
            if (typeof mss === "undefined" || mss.length === 0) {
                e.reply("未获得到聊天记录");
                return true;
            }
            q = mss[0].raw_message;
        }
        let index = 0;
        let msg = e.msg?.replace("M_onlyPm_", "");
        let flag = /^#?tts翻译/.test(msg)
        while (msg[index] !== " " && index < msg.length) index++;
        let arg = new Array(2);
        arg[0] = msg.substr(0, index);
        arg[1] = msg.substr(index + 1, msg.length - 1);
        if (!arg[0].includes(",")) {
            let t = arg[0][arg[0].length - 1];
            if (map[t]) to = map[t];
        } else {
            let types = arg[0].split(",");
            let t = types[1];
            if (map[t]) to = map[t];
            t = types[0][types[0].length - 1];
            if (map[t]) from = map[t];
        }
        if (!e.source) q = arg[1].replace(/^\s+|\s+$/, "");
        let salt = Math.floor(Date.now() / 1000);
        let sign = md5(`${this.appid}${q}${salt}${this.secret_key}`);
        let url = "http://api.fanyi.baidu.com/api/trans/vip/translate";
        let query = `q=${q}&from=${from}&to=${to}&appid=${this.appid}&salt=${salt}&sign=${sign}`;
        url += "?" + query;
        let response = await fetch(url, {method: "get"});
        if (!response.ok) {
            e.reply("接口错误");
            return true;
        } else {
            response = await response.json();
            if (!response['error_code']) {
                let rsq = response['trans_result'][0].dst
                e.reply(rsq);
                if (to === "wyw") to = 'zh'
                ttsUrl = encodeURI(`https://fanyi.baidu.com/gettts?lan=${to}&text=${rsq}&spd=3&source=web`)
                if (flag) this.toTTS(e)
            } else {
                e.reply("出错了,请切换其他语言");
            }
            return true;
        }
    }

    cfgTrans(e) {
        if (!e.isMaster || !e.isPrivate) return true;
        if (!e.cfgTrans) {
            e.reply("请按格式输入配置，格式为：\nappId={appId};secret_key={secret_key};\n例：appId=asd_dsfdf;secret_key=dsa778_dsf;")
            return true
        } else {
            let queryString = querystring.parse(e.cfgTrans, ";", "=");
            if (!queryString.appId || !queryString.secret_key) {
                e.reply("没有正确获取到配置信息，请检查格式是否正确！");
                return true
            }
            let cfg = {
                appId: queryString.appId,
                secret_key: queryString.secret_key
            }
            Cfg.set("translate", cfg);
            this.reloadCfg();
            e.reply(`配置成功:\nappId=${cfg.appId};secret_key=${cfg.secret_key};`);
            return true
        }
    }

    transHelp(e) {
        e.reply("[0] 中文\n[1] 英语\n[2] 粤语\n[3] 文言文\n[4] 日语\n[5] 韩语\n[6] 法语\n[7] 西班牙语\n[8] 泰语\n[9] 阿拉伯语\n[10] 俄语\n[11] 葡萄牙语");
        return true;
    }

    delCfg(e) {
        if (!e.isMaster) return true;
        Cfg.del("translate");
        this.appid = null;
        this.secret_key = null;
    }
}