const fs = require("fs")
const path = require("path")
const cp = require("child_process")
const {EventEmitter} = require("events")

const bots = new Map

/**
 * @type {cp.ChildProcess}
 */
let worker
let flag = true;

function startWorker() {
    if (!flag) return;
    console.log(Date(), "sandbox启动")
    worker = cp.fork(path.join(__dirname, "bridge.js"))
    worker.on("error", (err) => {
        fs.appendFile("err.log", Date() + " " + err.stack + "\n", () => {
        })
    })
    worker.on("exit", () => {
        console.log(Date(), "sandbox停止")
        startWorker()
    })
    worker.on("message", async (value) => {
        if (value.type === "answer") {
            global.resMap.get(value.id)?.(value.data)
            global.resMap.delete(value.id)
            return;
        }
        let bot = bots.get(value?.uin)
        if (value.method === "sendGroupMsg") {
            const gid = Number(value?.params?.[0])
            if (!bot?.gl.has(gid)) {
                for (const [_, b] of bots) {
                    if (b.gl.has(gid)) {
                        bot = b
                        break
                    }
                }
            }
        }
        if (!bot)
            return
        let ret = await bot[value?.method]?.apply(bot, value?.params)
        if (ret instanceof Map)
            ret = Array.from(ret)
        if (ret)
            ret.echo = value?.echo
        worker.send({
            data: ret,
            echo: value?.echo
        })
    })
}

startWorker();

function listener(data) {
    data.self_id = this.uin
    worker.send(data)
}

/**
 * 当一个bot实例启用了此插件时被调用
 * @param {import("oicq").Client} bot
 */
function activate(bot) {
    bots.set(bot.uin, bot)
    bot.on("message", listener)
    bot.on("notice", listener)
    bot.on("request", listener)
    // bot.on("system", listener)
}

/**
 * 当一个bot实例禁用了此插件时被调用
 * @param {import("oicq").Client} bot
 */
function deactivate(bot) {
    bot.off("message", listener)
    bot.off("notice", listener)
    bot.off("request", listener)
    // bot.off("system", listener)
    bots.delete(bot.uin)
}

function destructor() {
    bots.clear()
    flag = false
    worker?.kill()
}

function restart() {
    destructor()
    flag = true
    startWorker()
}

/**
 * 初始化sandbox
 * @param {import("oicq").Client} bot
 */
function init(bot) {
    bots.set(bot.uin, bot)
    // 只支持oicq和icqq，不是oicq就用icqq的事件触发
    // oicq和icqq的监听时一样的所以不需要区分
    try {
        bot.on("notice", preDeal)
        bot.on("request", preDeal)
        global.sdb = {
            add: function(key, value) {
                if (!key || !value) return;
                worker.send({
                    type: 'include',
                    key: key,
                    value: value
                })
            },
            exec: function(code){
                worker.send({
                    type: 'exec',
                    code: code
                })
            }
        }
    } catch (e) {
        bot.logger.error(e)
    }
}

/**
 * 初始化sandbox
 * @param {import("oicq").Client} bot
 */
function close(bot) {
    // oicq和icqq的关闭单个监听器不一样需要区分
    delete global.sdb;
    if (bot instanceof EventEmitter) {
        bot.off("notice", preDeal)
        bot.off("request", preDeal)
    } else {
        try {
            icqqOff.call(bot, "notice", "preDeal")
            icqqOff.call(bot, "request", "preDeal")
        } catch (e) {
            bot.logger.error(e)
        }
    }
    bots.delete(bot.uin)
}

function icqqOff(event, fnName) {
    if (!this.matchers) return;
    const matchers = this.getMatchers(event);
    for (let i in matchers) {
        if (this.matchers.get(matchers[i]).name === fnName) {
            this.matchers.delete(matchers[i]);
            return;
        }
    }
}

function dealMsg(data) {
    data.self_id = this.uin;
    worker.send(data)
}

function preDeal(data) {
    delete data.runtime;
    delete data.reply;
    dealMsg(data)
}

function saveCtx() {
    worker.send({
        type: "saveCtx"
    })
}

module.exports = {
    activate, deactivate, destructor, dealMsg, init, close, saveCtx, restart
}
