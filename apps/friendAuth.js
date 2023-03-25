import Plugin from "../../../lib/plugins/plugin.js";
import md5 from "md5";
import {Cfg, Version, Common} from "../components/index.js";
import lodash from "lodash";

const collection = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
let timer = {};

export class friendAuth extends Plugin {
    constructor() {
        super({
            name: '加好友',
            dsc: '设置加我好友的方式',
            event: 'message.private',
            priority: 100,
            rule: [
                {
                    reg: '^#派蒙设置加好友(1|2|3)$',
                    fnc: 'setMethod',
                    permission: 'master',
                },
                {
                    reg: '^#加好友$',
                    fnc: 'getMethod',
                    permission: 'master',
                },
                {
                    reg: '^#派蒙设置salt=(.)*$',
                    fnc: 'setSalt',
                    permission: 'master',
                },
                {
                    reg: '#SALT',
                    fnc: 'showSalt',
                    permission: 'master',
                },
                {
                    reg: "#ANSWER",
                    fnc: "showAns",
                    permission: 'master',
                }
            ]
        })
        this.cfg = Cfg.get("friendAuth") || {};
    }

    async init() {
        let type = this.cfg.type || await getType();
        if (type === 3) {
            if ((Bot?.listenerCount?.("notice.friend.increase") || Bot?.listeners?.("notice.friend.increase")?.length) === 0) {
                Bot.on("notice.friend.increase", async () => {
                        await dealStrict.call(this)
                    }
                )
            }
            if ((Bot?.listenerCount?.('setAuthError') || Bot?.listeners?.("setAuthError")?.length) === 0) {
                Bot.on("setAuthError", (msg) => {
                    Bot.pickFriend(Version.masterQQ).sendMsg(`加好友方式设置失败：${msg}`);
                })
            }
        }
        if (!this.cfg.type) {
            this.cfg.salt = "";
            this.cfg.type = type;
            this.cfg.answer = "";
            Cfg.set("friendAuth", this.cfg);
        }
    }

    async accept(e) {
        if (timer[e.user_id] && /^设置：[\s\S]*/.test(e.msg)) {
            clearTimeout(timer[e.user_id]);
            delete timer[e.user_id];
            let msg = e.msg.replace(/^设置：/, "");
            msg = msg.split(/[\r\n]/);
            let q = msg[0];
            let a = msg[1];
            let res = await setAuth(2, q, a);
            if (res === true) {
                e.reply(`设置成功,问题：${q}\n答案：${a}`);
                this.cfg.salt = "";
                this.cfg.type = 2;
                this.cfg.answer = a;
                Cfg.set("friendAuth", this.cfg);
            } else {
                e.reply(`设置失败：${res}`);
            }
        }
    }

    async setMethod(e) {
        let type = e.msg.replace("#派蒙设置加好友", "");
        type = Number(type);
        if (type === 2) {
            Bot.off("notice.friend.increase", dealStrict);
            (Bot?.removeAllListeners || Bot?.offTrap).call(Bot, "setAuthError");
            e.reply("请回复问题和答案，用换行隔开，请在两分钟之内回答。例如：设置：我的名字是什么？\n派蒙");
            timer[e.user_id] = setTimeout(() => {
                delete timer[e.user_id];
                Common.relpyPrivate(e.user_id, "时间超时，操作取消");
            }, 120000);
            return true;
        }
        if (type === 1) {
            Bot.off("notice.friend.increase", dealStrict);
            (Bot?.removeAllListeners || Bot?.offTrap).call(Bot, "setAuthError");
            let res = await setAuth(1);
            if (res === true) {
                e.reply("设置成功");
                this.cfg.salt = "";
                this.cfg.type = 1;
                this.cfg.answer = "";
                Cfg.set("friendAuth", this.cfg)
            } else {
                e.reply(`设置失败：${res}`);
            }
        } else {
            let seq = lodash.sampleSize(collection, 12).join("");
            let salt = this.cfg.salt || lodash.sampleSize(collection, 32).join("");
            let a = md5(`salt=${salt}&seq=${seq}`, 16).substr(8, 16);
            let q = `seq=${seq}`;
            let res = await setAuth(3, q, a);
            if (res !== true) {
                e.reply(`设置失败：${res}`);
                return true;
            }
            e.reply(`设置成功，salt=${salt},可通过【#SALT】查看当前salt`);
            this.cfg.salt = salt;
            this.cfg.type = 3;
            this.cfg.answer = "";
            Cfg.set("friendAuth", this.cfg);
            if ((Bot?.listenerCount?.("notice.friend.increase") || Bot?.listeners?.("notice.friend.increase")?.length) === 0) {
                Bot.on("notice.friend.increase", async () => {
                        await dealStrict.call(this);
                    }
                )
            }
            if ((Bot?.listenerCount?.("setAuthError") || Bot?.listeners?.("setAuthError")?.length) === 0) {
                Bot.on("setAuthError", (msg) => {
                    Bot.pickFriend(Version.masterQQ).sendMsg(`加好友方式设置失败：${msg}`);
                })
            }
        }
    }

    async getMethod(e) {
        if (this.cfg.type === 1) {
            e.reply("1：无限制，申请就会通过")
        } else if (this.cfg.type === 2) {
            e.reply("2：常规，需要正确回答问题")
        } else if (this.cfg.type === 3) {
            e.reply("3：严格，每通过一个好友就会生成新的问题和答案，需要联系机器人主人获得答案")
        } else {
            e.reply("未处理的加好友类型")
        }
        return true;
    }

    async setSalt(e) {
        let msg = e.msg.replace("#派蒙设置salt=", "");
        if (this.cfg.type === 3) {
            this.cfg.salt = msg;
            this.cfg.answer = "";
            Cfg.set("friendAuth", this.cfg);
            await dealStrict.call(this)
            e.reply("设置成功");
        } else {
            e.reply("加好友类型不为3");
        }
        return true;
    }

    showSalt(e) {
        if (this.cfg.type === 3) {
            e.reply(`salt=${this.cfg.salt}`);
        } else {
            e.reply("加好友类型不为3，salt为空");
        }
        return true;
    }

    showAns(e) {
        if (this.cfg.type === 1) {
            e.reply("当前加好友无限制，没有设置答案");
        } else if (this.cfg.type === 2) {
            if (this.cfg.answer) {
                e.reply(`问题答案=${this.cfg.answer}`);
            } else {
                e.reply("出错了，没有查到答案，请发送【#派蒙设置加好友2】重新设置")
            }
        } else if (this.cfg.type === 3) {
            e.reply("请获取问题的seq，取\"seq=${seq},salt=${salt}\"的16位MD5")
        } else {
            e.reply("未处理的加好友类型")
        }
        return true;
    }
}

async function setAuth(type, q = "", a = "") {
    let request;
    if (type === 1) {
        request = {
            at: 0,
            q: q,
            a: a,
            l: [],
            viaphone: 0
        }
    } else if (type === 2 || type === 3) {
        request = {
            at: 3,
            q: q,
            a: a,
            l: [],
            viaphone: 0
        }
    }
    let body = {
        req: JSON.stringify(request)
    }
    let url = 'https://ti.qq.com/cgi-node/friend-auth/set'
    let res = await fetch(url, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://ti.qq.com',
            'Referer': 'https://ti.qq.com/friendship_auth/index.html?_wv=3&_bid=173',
            'Cookie': `${Bot.cookies['ti.qq.com']}`
        },
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        return "接口错误";
    }
    res = await res.json();
    if (res.ec === 0) {
        return true;
    } else return res.msg;
}

async function dealStrict() {
    let seq = lodash.sampleSize(collection, 12).join("");
    let a = md5(`salt=${this.cfg.salt}&seq=${seq}`).substr(8, 16);
    let q = `seq=${seq}`;
    let res = await setAuth(3, q, a);
    if (res !== true) {
        Bot.em("setAuthError", res);
    }
}

async function getType() {
    let url = "https://ti.qq.com/friendship_auth/index.html?_wv=3&_bid=173"
    let res = await fetch(url, {
        method: 'get',
        headers: {
            "Content-Type": "text/html;charset=UTF-8",
            "Cookie": Bot.cookies['ti.qq.com']
        }
    });
    let html = await res.text();
    let ul = html.match(/<ul class="setting__form"><li role="menuitemradio"([\s\S]*)可通过以下方式加我为好友/)[0];
    let li = ul.split("</li>")
    for (let index = 0; index < li.length; index++) {
        if (li[index].includes('<i class="qui-icon-success" style="color:#00CAFC;font-size:16px;"></i>')) {
            if (index === 0 || index === 1) {
                return 1;
            } else if (index === 2) {
                return 2;
            } else return 4;
        }
    }
    return 4;
}