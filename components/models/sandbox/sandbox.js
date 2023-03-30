const fs = require("fs")
const path = require("path")
const zlib = require("zlib")
const vm = require("vm")
const dataPath = path.join(__dirname, "./")
const contextFile = path.join(dataPath, "context")
const fnFile = path.join(dataPath, "context.fn")
const initCodeFile = path.join(__dirname, "sandbox.code.js")
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {recursive: true, mode: 0o700})
}

//初始化context
let context = {}
//还原context中的数据
if (fs.existsSync(contextFile)) {
    context = JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(contextFile)))
}

//把context包装成proxy对象，来捕捉一些操作
let set_env_allowed = false
let init_finished = false
context = new Proxy(context, {
    set(o, k, v) {
        if (!init_finished)
            return Reflect.set(o, k, v)
        if (k === "set_history_allowed")
            return false
        if (k === "data" && !set_env_allowed)
            return false
        if (o.isProtected(k) && !o.isMaster())
            return false
        if (typeof o.recordSetHistory === "function") {
            o.set_history_allowed = true
            o.recordSetHistory(k)
            o.set_history_allowed = false
        }
        return Reflect.set(o, k, v)
    },
    defineProperty: (o, k, d) => {
        if (!init_finished || o.isMaster())
            return Reflect.defineProperty(o, k, d)
        else
            return false
    },
    deleteProperty: (o, k) => {
        if (!init_finished || o.isMaster() || !o.isProtected(k))
            return Reflect.deleteProperty(o, k)
        else
            return false
    },
    preventExtensions: (o) => {
        return false
    },
    setPrototypeOf: (o, prototype) => {
        return false
    }
})

//创建context
vm.createContext(context, {
    codeGeneration: {
        strings: false,
        wasm: false
    },
    microtaskMode: "afterEvaluate"
})

//还原context中的函数
if (fs.existsSync(fnFile)) {
    let fn = JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(fnFile)))
    const restoreFunctions = (o, name) => {
        for (let k in o) {
            let key = name + `["${k}"]`
            if (typeof o[k] === "string") {
                try {
                    vm.runInContext(`${key}=` + o[k], context)
                } catch (e) {
                }
            } else if (typeof o[k] === "object") {
                restoreFunctions(o[k], key)
            }
        }
    }
    restoreFunctions(fn, "this")
}

//执行init代码
vm.runInContext(fs.readFileSync(initCodeFile), context)

// SANDBOX_ROOT该环境变量为永久master
// vm.runInContext(`Object.defineProperty(this, "root", {
//     configurable: false,
//     enumerable: false,
//     writable: false,
//     value: "372914165"
// })`, context)

//冻结内置对象(不包括console,globalThis)
const internal_properties = [
    'Object', 'Function', 'Array',
    'Number', 'parseFloat', 'parseInt',
    'Boolean', 'String', 'Symbol',
    'Date', 'RegExp', 'eval',
    'Error', 'EvalError', 'RangeError',
    'ReferenceError', 'SyntaxError', 'TypeError',
    'URIError', 'JSON', 'Promise',
    'Math', 'Intl',
    'ArrayBuffer', 'Uint8Array', 'Int8Array',
    'Uint16Array', 'Int16Array', 'Uint32Array',
    'Int32Array', 'Float32Array', 'Float64Array',
    'Uint8ClampedArray', 'BigUint64Array', 'BigInt64Array',
    'DataView', 'Map', 'BigInt',
    'Set', 'WeakMap', 'WeakSet',
    'Proxy', 'Reflect', 'decodeURI',
    'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
    'escape', 'unescape',
    'isFinite', 'isNaN', 'SharedArrayBuffer',
    'Atomics', 'WebAssembly'
]
for (let v of internal_properties) {
    vm.runInContext(`this.Object.freeze(this.${v})
this.Object.freeze(this.${v}.prototype)
const ${v} = this.${v}`, context)
}
init_finished = true

vm.runInContext(`try{this.afterInit()}catch(e){}`, context)

//定时持久化context(60分钟)
let fn
const saveFunctions = (o, mp) => {
    for (let k in o) {
        if (typeof o[k] === "function") {
            mp[k] = o[k] + ""
        } else if (typeof o[k] === "object" && o[k] !== null) {
            if (o === context) {
                try {
                    if (JSON.stringify(o[k]).length > 10485760)
                        o[k] = undefined
                } catch (e) {
                    o[k] = undefined
                }
            }
            if (o[k] === undefined)
                continue
            mp[k] = {}
            saveFunctions(o[k], mp[k])
        } else if (typeof o[k] === "bigint") {
            o[k] = Number(o[k])
        }
    }
}
const beforeSaveContext = () => {
    setEnv()
    fn = {}
    saveFunctions(context, fn)
}
const brotli_options = {
    params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 5
    }
}
process.on("exit", (code) => {
    if (code !== 200)
        return
    beforeSaveContext()
    fs.writeFileSync(fnFile, zlib.brotliCompressSync(JSON.stringify(fn), brotli_options))
    fs.writeFileSync(contextFile, zlib.brotliCompressSync(JSON.stringify(context), brotli_options))
})

/**
 * 保存上下文
 */
setInterval(saveCtx, 3600000)

function saveCtx() {
    beforeSaveContext()
    zlib.brotliCompress(
        JSON.stringify(fn),
        brotli_options,
        (err, res) => {
            if (res)
                fs.writeFile(fnFile, res, () => {
                })
        }
    )
    zlib.brotliCompress(
        JSON.stringify(context),
        brotli_options,
        (err, res) => {
            if (res)
                fs.writeFile(contextFile, res, () => {
                })
        }
    )
}

module.exports.saveCtx = saveCtx;

//沙盒执行超时时间
let timeout = 500
module.exports.getTimeout = (t) => timeout
module.exports.setTimeout = (t) => timeout = t

//执行代码
module.exports.run = (code) => {
    code = code.trim()
    let debug = ["\\", "＼"].includes(code.substr(0, 1))
    if (debug)
        code = code.substr(1)
    try {
        let code2 = vm.runInContext(`this.beforeExec(${JSON.stringify(code)})`, context, {timeout: timeout})
        if (typeof code2 === "string")
            code = code2
        let res = vm.runInContext(code, context, {timeout: timeout})
        if (res instanceof vm.runInContext("Promise", context))
            res = undefined
        context._current_echo = res
        let res2 = vm.runInContext(`this.afterExec()`, context, {timeout: timeout})
        if (typeof res2 !== "undefined")
            res = res2
        return res
    } catch (e) {
        if (debug) {
            let line = e?.stack.split("\n")[0].split(":").pop()
            return e.name + ": " + e.message + " (line: " + parseInt(line) + ")"
        }
    }
}
//执行代码 raw
module.exports.exec = (code) => {
    return vm.runInContext(code, context, {timeout: timeout})
}

//设置环境变量
const setEnv = (env = {}) => {
    set_env_allowed = true
    vm.runInContext(`this.data=${JSON.stringify(env)}
contextify(this.data)`, context)
    set_env_allowed = false
}
module.exports.setEnv = setEnv

//传递一个外部对象到context
module.exports.include = (name, object) => {
    context[name] = object
    vm.runInContext(`const ${name} = this.${name}
contextify(${name})`, context)
}

//返回context
module.exports.getContext = () => context
