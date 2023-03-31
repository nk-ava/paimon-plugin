const Cfg = require("./config")
let modules = Cfg.modules;
if (modules.canvas) {
    var {createCanvas, loadImage} = require("canvas");
}
const http = require("http")
const https = require("https")
const zlib = require("zlib")
const isValidUTF8 = require('utf-8-validate')
const stringify = require('string.ify')
const {segment} = require('oicq')

const stringify_config = stringify.configure({
    pure: false,
    json: false,
    maxDepth: 2,
    maxLength: 10,
    maxArrayLength: 20,
    maxObjectLength: 20,
    maxStringLength: 30,
    precision: undefined,
    formatter: undefined,
    pretty: true,
    rightAlignKeys: true,
    fancy: false,
    indentation: '  ',
})
const sandbox = require("./sandbox")

process.on("disconnect", process.exit)
process.on("message", (value) => {
    if (value?.type === "saveCtx") {
        sandbox.saveCtx();
        return;
    }
    if (!value.echo) {
        onmessage(value)
    } else {
        handler.get(value.echo)?.(value)
        handler.delete(value.echo)
    }
})
const handler = new Map

function callApi(method, params = [], check = true) {
    if (check)
        precheck(() => {
        })
    const echo = String(Math.random()) + String(Date.now())
    process.send({
        uin: getSid(),
        method, params, echo
    })
    return new Promise((resolve) => handler.set(echo, resolve))
}

const bots = new Map

async function init(data, gid) {
    if (!bots.has(data.self_id))
        bots.set(data.self_id, {})
    const bot = bots.get(data.self_id)
    if (!bot.groups) {
        sandbox.setEnv(data)
        bot.groups = (await callApi("getGroupList", [], false)).data
        bot.groups = new Map(bot.groups)
    }
    if (!gid) {
        for (const [gid, ginfo] of bot.groups) {
            sandbox.setEnv(data)
            let members = (await callApi("getGroupMemberList", [gid], false)).data
            if (!members) continue
            members = new Map(members)
            ginfo.members = {}
            for (const [uid, minfo] of members) {
                ginfo.members[uid] = minfo
                Object.freeze(minfo)
            }
            Object.freeze(ginfo.members)
            Object.freeze(ginfo)
        }
    } else {
        sandbox.setEnv(data)
        const ginfo = (await callApi("getGroupInfo", [gid], false)).data
        sandbox.setEnv(data)
        let members = (await callApi("getGroupMemberList", [gid], false)).data
        if (!ginfo || !members) return
        members = new Map(members)
        ginfo.members = {}
        for (const [uid, minfo] of members) {
            ginfo.members[uid] = minfo
            Object.freeze(minfo)
        }
        Object.freeze(ginfo.members)
        Object.freeze(ginfo)
        bot.groups.set(gid, ginfo)
    }
}

const getGid = () => sandbox.getContext().data.group_id
const getSid = () => sandbox.getContext().data.self_id

const async_queue = {}
const checkAndAddAsyncQueue = (o) => {
    const key = getSid() + getGid() + sandbox.getContext().data.user_id
    if (!async_queue.hasOwnProperty([key])) {
        async_queue[key] = new Map()
        async_queue[key].set("start_moment", 0)
    }
    let endless_flag = false
    let start_moment = async_queue[key].get("start_moment")
    async_queue[key].forEach((v, k, map) => {
        if (k === "start_moment")
            return
        if (v.end_time && Date.now() - v.end_time > 500)
            map.delete(k)
        else {
            endless_flag = true
            if (start_moment === 0)
                async_queue[key].set("start_moment", Date.now())
        }
    })
    if (!endless_flag)
        async_queue[key].set("start_moment", 0)
    if (async_queue[key].get("start_moment") > 0 && Date.now() - async_queue[key].get("start_moment") > 60000) {
        async_queue[key].set("start_moment", 0)
        throw new Error("判定为递归调用，中断。")
    }
    async_queue[key].set(o, {start_time: Date.now(), end_time: undefined})
}

const asyncCallback = (o, env, callback, argv = []) => {
    const key = env.self_id + env.group_id + env.user_id
    async_queue[key].get(o).end_time = Date.now()
    sandbox.setEnv(env)
    const function_name = "tmp_" + Date.now()
    const argv_name = "tmp_argv_" + Date.now()
    sandbox.getContext()[function_name] = callback
    sandbox.getContext()[argv_name] = argv
    try {
        sandbox.exec(`this.${function_name}.apply(null, this.${argv_name})`)
    } catch (e) {
    }
    sandbox.exec(`delete this.${function_name};delete this.${argv_name}`)
}

const buckets = {}
const checkFrequency = () => {
    let uid = sandbox.getContext().data.user_id
    if (!uid)
        return
    if (buckets.hasOwnProperty(uid) && Date.now() - buckets[uid].time > 300)
        delete buckets[uid]
    if (!buckets.hasOwnProperty(uid))
        buckets[uid] = {time: 0, cnt: 0}
    if (buckets[uid].cnt >= 3)
        throw new Error("调用频率太快。")
    buckets[uid].time = Date.now()
    ++buckets[uid].cnt
}

const precheck = function (caller) {
    checkFrequency()
    let function_name = "current_called_api_" + Date.now()
    sandbox.getContext()[function_name] = caller
    sandbox.exec(`if (typeof this.beforeApiCalled === "function") {
    this.beforeApiCalled(this.${function_name})
    delete this.${function_name}
}`)
}

sandbox.include("setTimeout", function (fn, timeout = 5000, argv = []) {
    checkFrequency()
    checkAndAddAsyncQueue(this)
    if (typeof fn !== "function")
        throw new TypeError("fn(第一个参数)必须是函数。")
    timeout = parseInt(timeout)
    if (isNaN(timeout) || timeout < 5000)
        throw new Error("延迟时间不能小于5000毫秒。")
    const env = sandbox.getContext().data
    const cb = () => asyncCallback(this, env, fn, argv)
    return setTimeout(cb, timeout)
})
sandbox.include("clearTimeout", clearTimeout)

const fetch = function (url, callback = () => {
}, headers = null) {
    checkFrequency()
    checkAndAddAsyncQueue(this)
    if (typeof url !== "string")
        throw new TypeError("url(第一个参数)必须是字符串。")
    if (typeof callback !== "function")
        throw new TypeError("callback(第二个参数)必须是函数。")
    if (typeof headers !== "object")
        throw new TypeError("headers(第三个参数)必须是对象。")
    const env = sandbox.getContext().data
    const cb = (data) => asyncCallback(this, env, callback, [data])
    url = url.trim()
    const protocol = url.substr(0, 5) === "https" ? https : http
    let data = []
    let size = 0
    const options = {
        headers: {
            "Accept-Encoding": "gzip",
            ...headers
        }
    }
    try {
        protocol.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                res.headers["status-code"] = res.statusCode
                cb(res.headers)
                return
            }
            res.on("data", chunk => {
                size += chunk.length
                if (size > 500000) {
                    res.destroy()
                    return
                }
                data.push(chunk)
            })
            res.on("end", () => {
                if (res.headers["content-encoding"] && res.headers["content-encoding"].includes("gzip")) {
                    try {
                        zlib.gunzip(Buffer.concat(data), (err, buffer) => {
                            if (err)
                                buffer = JSON.stringify(err)
                            cb(buffer.toString())
                        })
                    } catch {
                    }
                } else {
                    const buf = Buffer.concat(data)
                    cb(isValidUTF8(buf) ? buf.toString() : buf)
                }
            })
        }).on("error", err => cb(err))
    } catch (e) {
        cb(e)
    }
}
sandbox.include("fetch", fetch)

//master可以执行任意代码
sandbox.include("run", (code) => {
    if (sandbox.getContext().isMaster()) {
        try {
            return eval(code)
        } catch (e) {
            return e.stack
        }
    } else
        throw new Error("403 forbidden")
})

//导入一些工具模块
if (modules.syanten) sandbox.include("向听", require("syanten"))
if (modules.riichi) sandbox.include("MJ", require("riichi"))
// sandbox.include("cheerio", require("cheerio"))
if (modules.cheerio) sandbox.getContext().cheerio = require("cheerio") //临时对应
if (modules.moment) sandbox.include("moment", require("moment"))
if (modules.assert) sandbox.include("assert", require("assert"))
if (modules.crypto) sandbox.getContext().crypto = require("crypto")
if (modules.querystring) sandbox.include("querystring", require("querystring"))
if (modules.path) sandbox.include("path", require("path"))
if (modules.zip) sandbox.include("zip", require("zlib").deflateSync)
if (modules.unzip) sandbox.include("unzip", require("zlib").unzipSync)
if (modules.os) sandbox.include("os", require("os"))
if (modules.buffer) sandbox.include("Buffer", Buffer)
if (modules.canvas) {
    sandbox.include("createCanvas", createCanvas)

    function loadCanvasImage(buf, cb) {
        const env = sandbox.getContext().data
        checkAndAddAsyncQueue(this)
        loadImage(buf).then((image) => {
            asyncCallback(this, env, cb, [image])
        }).catch(() => {
        })
    }

    sandbox.include("loadCanvasImage", loadCanvasImage)
}
//导入主人QQ
sandbox.include("master", Cfg.master);

// 色情敏感词过滤
const ero = /(母狗|看批|日批|香批|批里|成人|无码|苍井空|b里|嫩b|嫩比|小便|大便|粪|屎|尿|淦|屄|屌|奸|淫|穴|肏|肛|骚|逼|妓|艹|子宫|月经|危险期|安全期|戴套|无套|内射|中出|射在里|射在外|精子|卵子|受精|幼女|嫩幼|粉嫩|日我|日烂|草我|草烂|干我|日死|草死|干死|狂草|狂干|狂插|狂操|日比|草比|搞我|舔我|舔阴|浪女|浪货|浪逼|浪妇|发浪|浪叫|淫荡|淫乱|荡妇|荡女|荡货|操烂|抽插|被干|被草|被操|被日|被上|被艹|被插|被射|射爆|射了|颜射|射脸|按摩棒|肉穴|小穴|阴核|阴户|阴阜|阴蒂|阴囊|阴部|阴道|阴唇|阴茎|肉棒|阳具|龟头|勃起|爱液|蜜液|精液|食精|咽精|吃精|吸精|吞精|喷精|射精|遗精|梦遗|深喉|人兽|兽交|滥交|拳交|乱交|群交|肛交|足交|脚交|口爆|口活|口交|乳交|乳房|乳头|乳沟|巨乳|玉乳|豪乳|暴乳|爆乳|乳爆|乳首|乳罩|奶子|奶罩|摸奶|胸罩|摸胸|胸部|胸推|推油|大保健|黄片|爽片|a片|野战|叫床|露出|露b|漏出|漏b|乱伦|轮奸|轮暴|轮操|强奸|强暴|情色|色情|全裸|裸体|果体|酥痒|捏弄|套弄|体位|骑乘|后入|二穴|三穴|嬲|调教|凌辱|饥渴|好想要|性交|性奴|性虐|性欲|性行为|性爱|做爱|作爱|手淫|撸管|自慰|痴女|鸡8|鸡ba|鸡鸡|鸡巴|鸡吧|鸡儿|肉便器|泄欲|发泄|高潮|潮吹|潮喷|爽死|爽翻|爽爆|你妈|屁眼|后庭|菊花|援交|操死|插死)/ig

function filter(msg) {
    if (typeof msg === "undefined")
        return
    else if (typeof msg !== "string")
        msg = stringify_config(msg)
    msg = msg.replace(ero, "⃺")
    if (!msg.length)
        return
    return msg
}

// qq api
const $ = {}
$.getGroupInfo = () => {
    return bots.get(getSid())?.groups?.get(getGid())
}
$.sendPrivateMsg = (uid, msg, escape_flag = false) => {
    msg = filter(msg)
    if (!msg) return
    callApi("sendPrivateMsg", [uid, segment.fromCqcode(msg)])
}
$.sendGroupMsg = (gid, msg, escape_flag = false) => {
    msg = filter(msg)
    if (!msg) return
    callApi("sendGroupMsg", [gid, segment.fromCqcode(msg)])
}
$.sendDiscussMsg = (id, msg, escape_flag = false) => {
    msg = filter(msg)
    if (!msg) return
    callApi("sendDiscussMsg", [id, segment.fromCqcode(msg)])
}
$.deleteMsg = (message_id) => {
    callApi("deleteMsg", [message_id])
}
$.sendGroupForwardMsg = (gid, msgs) => {
    callApi("makeForwardMsg", [msgs])
        .then(xml => {
            callApi("sendGroupMsg", [gid, xml?.data])
        })
        .catch(() => {
        })
}
// $.setGroupKick = (uid, forever = false)=>{
//     callApi("setGroupKick", [getGid(), uid, forever])
// }
// $.setGroupBan = (uid, duration = 60)=>{
//     callApi("setGroupBan", [getGid(), uid, duration])
// }
$.setGroupAnonymousBan = (flag, duration = 60) => {
    callApi("setGroupAnonymousBan", [getGid(), flag, duration])
}
$.setGroupAdmin = (uid, enable = true) => {
    callApi("setGroupAdmin", [getGid(), uid, enable])
}
// $.setGroupWholeBan = (enable = true)=>{
//     callApi("setGroupWholeBan", [getGid(), enable])
// }
$.setGroupAnonymous = (enable = true) => {
    callApi("setGroupAnonymous", [getGid(), enable])
}
$.setGroupCard = (uid, card) => {
    callApi("setGroupCard", [getGid(), uid, card])
}
// $.setGroupLeave = (dismiss = false)=>{
//     callApi("setGroupLeave", [getGid(), dismiss])
// }
$.setGroupSpecialTitle = (uid, title, duration = -1) => {
    callApi("setGroupSpecialTitle", [getGid(), uid, title, duration])
}
// $.sendGroupNotice = (content)=>{
//     callApi("sendGroupNotice", [getGid(), content])
// }
$.sendGroupPoke = (uid) => {
    callApi("sendGroupPoke", [getGid(), uid])
}
$.setGroupRequest = (flag, approve = true, reason = undefined) => {
    callApi("setGroupAddRequest", [flag, approve, reason])
}
$.setFriendRequest = (flag, approve = true, remark = undefined) => {
    callApi("setFriendAddRequest", [flag, approve, remark])
}
$.setGroupInvitation = (flag, approve = true, reason = undefined) => {
    callApi("setGroupAddRequest", [flag, approve, reason])
}
$.inviteFriend = (gid, uid) => {
    callApi("inviteFriend", [gid, uid])
}
$.ajax = fetch
$.get = fetch
sandbox.include("$", $)

/**
 * @param msg 待处理的cq码
 */
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

/**
 * @param {import("oicq").EventData} data
 */
function onmessage(data) {
    if (data.post_type === "message") {
        if (data.message_type === "group" && bots.has(data.user_id) && data.user_id !== data.self_id && data.user_id < data.self_id) {
            return callApi("setGroupLeave", [data.group_id], false)
        }
        let message = ""
        for (let v of data.message) {
            if (v.type === "text")
                message += v.text
            else if (v.type === "at") {
                if (v.qq === data.self_id && !message)
                    continue
                message += `'[CQ:at,qq=${v.qq}]'`
            } else {
                for (let k in v) {
                    if (k === "type")
                        message += `[CQ:${v.type}`
                    else
                        message += `,${k}=${v[k]}`
                }
                message += `]`
            }
        }
        message = message.trim()
        data.message = message
        sandbox.setEnv(data)
        if (/\[CQ:[^\]]+\]/.test(message)) message = toStr(message)
        if (/^```[\s\S]*```$/.test(message)) {
            let str = (message.match(/```[\s\S]*```/)[0]).replace(/```/g, "").trim();
            message = message.replace(/```[\s\S]*```/, JSON.stringify(str));
        }
        try {
            let res = sandbox.run(message)
            if (typeof res === 'string' && res.includes("`") && /\[CQ:[^\]]+\]/.test(res)) res = sandbox.run(res)
            let echo = true
            if (message.match(/^'\[CQ:at,qq=\d+\]'$/))
                echo = false
            if (res === null && message === "null")
                echo = false
            if (["number", "boolean"].includes(typeof res) && res.toString() === message)
                echo = false
            if (message.substr(0, 1) === "\\" && typeof res === "undefined")
                res = "<undefined>"
            res = filter(res)
            if (echo && res) {
                res = segment.fromCqcode(res)
                process.send({
                    type: "answer",
                    id: data['message_id'],
                    data: res
                })
                /*if (data.message_type === "private") {
                    callApi("sendPrivateMsg", [data.user_id, res], false)
                } else if (data.message_type === "group") {
                    callApi("sendGroupMsg", [data.group_id, res], false)
                } else if (data.message_type === "discuss") {
                    callApi("sendDiscussMsg", [data.discuss_id, res], false)
                }*/
            } else {
                process.send({
                    type: "answer",
                    id: data['message_id'],
                    data: ""
                })
            }
        } catch (err) {
            process.send({
                type: "answer",
                id: data['message_id'],
                data: `ERROR：${err}`
            })
        }
    } else {
        sandbox.setEnv(data)
    }
    if (!bots.has(data.self_id))
        init(data)
    else if (data.post_type === "notice" && data.notice_type === "group")
        init(data, data.group_id)
    try {
        sandbox.exec(`try{this.onEvents()}catch(e){}`)
    } catch {
    }
}

//防止沙盒逃逸
Function.prototype.view = Function.prototype.toString
Function.prototype.constructor = new Proxy(Function, {
    apply: () => {
        throw Error("想跟妾身斗，汝还差得远呢。")
    },
    constructor: () => {
        throw Error("想跟妾身斗，汝还差得远呢。")
    }
})
Object.freeze(Object)
Object.freeze(Object.prototype)
Object.freeze(Function)
Object.freeze(Function.prototype)
