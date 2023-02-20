import {segment} from "oicq";
import Plugin from "../../../lib/plugins/plugin.js";
import fs from "node:fs";
import request from "request";
import util from "util";
import {SendPm,Version} from "../components/index.js";
import {createContext, Script} from "vm";


let data = {};
let sandboxEnv = {};
let sandboxContext = {};
let selfUid = global.Bot.uin;
export class sandbox extends Plugin {
    constructor(e) {
        super({
            name: '沙盒',
            desc: '运行代码环境',
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: "^#*(开启|关闭)命令模式$",
                    fnc: 'cmdSwitch'
                }
            ]
        });
    }
    //命令模式
    async accept(e) {
        if (ISCMD) {
            let flag = false;
            data = {...e};
            delete data['replyNew']
            delete data['runtime']
            delete data['user']
            delete data['reply']
            sandboxEnv.data = data;
            if (data.group) data.group = {};
            if (data.friend) data.friend = {};
            let msg = e.toString();
            let cqcode = /\[CQ:[^\]]+\]/;
            if (/while|for/g.test(msg) && !e.isMaster) return false;
            msg = msg.replace(/this\.?/g, "");
            if (cqcode.test(msg)) msg = toStr(msg);
            if (msg[0] === "\\") {
                flag = true;
                msg = msg.substr(1, msg.length);
            } else if (msg[0] === "/") {
                let funcName = (msg.match("\\/\\S+\\s*")[0]);
                let args = genArgs(msg.replace(funcName, ""));
                funcName = funcName.replace("/", "").trim();
                msg = funcName + args;
            }
            try {
                let reg = /^\s*request.?\w*\([\s\S]*\)/;
                let script = new Script(msg);
                let result = script.runInContext(sandboxContext);
                if (typeof result != "undefined" && !reg.test(msg)) {
                    if (typeof result === "string" && cqcode.test(result)) {
                        if (result.includes("`")) {
                            let srp;
                            srp = new Script(result);
                            result = srp.runInContext(sandboxContext);
                        }
                        let mss = segment.fromCqcode(result);
                        e.reply(mss);
                        return true;
                    }
                    e.reply(toString(result));
                } else {
                    if (flag) e.reply(toString(result));
                }
                return true;
            } catch (err) {
                if (flag) e.reply(err.toString());
                return false;
            }
        }
    }
    //命令模式开关
    cmdSwitch(e) {
        if (!e.isMaster) {
            return true;
        }
        if (e.msg.includes("开启")) {
            if (!fs.existsSync("./plugins/paimon-plugin/resources/user_functions.json")) {
                fs.writeFileSync("./plugins/paimon-plugin/resources/user_functions.json", "{}");
            }
            if (!ISCMD) {
                ISCMD = true;
                let user_Fc = fs.readFileSync("./plugins/paimon-plugin/resources/user_functions.json", "utf8");
                user_Fc = JSON.parse(user_Fc, prs);
                sandboxEnv = Object.assign(user_Fc, {
                    request,
                    alert,
                    segment,
                    SendPm,
                    qq,
                    qun,
                    process,
                    BotConfig,
                    NoteCookie,
                    Bot
                });
                sandboxContext = createContext(sandboxEnv);
            }
            e.reply("命令模式已开启");
        } else {
            if (ISCMD) {
                ISCMD = false;
                let ss = JSON.stringify(sandboxEnv, strify, "\t");
                fs.writeFileSync("./plugins/paimon-plugin/resources/user_functions.json", ss);
                sandboxEnv = {};
            }
            e.reply("命令模式已关闭");
        }
        return true;
    }
}

function strify(key, value) {
    if (typeof value === "function") {
        return value.toString();
    }
    return value;
}
function prs(key, value) {
    try {
        let obj = eval("(" + value + ")");
        if (typeof obj === "object") {
            return obj;
        } else if (typeof obj === "function") {
            return obj;
        } else return value;
    } catch (err) {
        return value;
    }
}

function toString() {
    let s = util.format.apply(null, arguments);
    return s;
}

function qun(e = data) {
    return e.group_id;
}

function qq(e = data) {
    return e.user_id;
}

function alert(msg) {
    if (!qun()) global.Bot.pickFriend(qq()).sendMsg(msg);
    else global.Bot.pickGroup(qun()).sendMsg(msg);
}

function toStr(msg) {
    let str = "", cnt = 0 * 1;
    for (let i in msg) {
        if (msg[i] === "`") {
            if (cnt === 0) {
                str += "\"`";
                cnt += 1;
            } else {
                str += "`\"";
                cnt -= 1;
            }
        } else str += msg[i];
    }
    return str;
}

function genArgs(str) {
    let kh = 0, jkh = 0, zkh = 0, dyh = 0, syh = 0;
    let lastIndex = 0;
    let ans = [];
    for (let i = 0; i < str.length; i++) {
        if (str[i] === "\'") dyh++;
        else if (str[i] === "\"") syh++;
        else if (str[i] === " ") {
            if (!(dyh % 2) && !(syh % 2)) {
                ans.push(str.substr(lastIndex, i - lastIndex));
                lastIndex = i + 1;
            }
        }
    }
    ans.push(str.substr(lastIndex, str.length - lastIndex));
    if (dyh % 2 == 0 && syh % 2 == 0) {
        ans = "(" + ans.join(",") + ")";
        return ans;
    } else return false;
}

//重写process
let process = {
    exit: () => {
        return '爪巴';
    },
    env: () => {
        return "蒙德城"
    },
    platform: () => {
        return "提瓦特智能手机"
    },
    title: () => {
        return "派蒙"
    }
}

//重写BotConfig
let BotConfig = {
    account: {
        qq: selfUid,
        password: "************",
        platform: 1,
        autoFriend: 1,
        autoQuit: 1,
    },
    masterQQ: Version.masterQQ,
    cookieDoc: "docs.qq.com/doc/DUWNVQVFTU3liTVlO",
    note: "略略略，就是不给你看",
}

//重写NoteCookie
let NoteCookie = {
    read: () => {
        return "好看吗"
    },
    delete: () => {
        return "删不掉的哦"
    },
    Cookie: () => {
        return "Cookie=*************,ltoken=*****************"
    },
    note: "略略略，就是不给你看",
}

//重写Bot
let Bot = {
    logout: () => {
        return "登出账号成功，请Bot.login()登入账号"
    },
    login: (qq, pwd) => {
        if (qq && pwd) {
            return "登入成功";
        } else return "请输入账号和密码";
    },
    name: "PaiMon",
    qq: selfUid,
    masterQQ: Version.masterQQ,
}