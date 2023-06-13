/*
 * 该文件中的所有代码必须在sandbox中执行
 */

//函数定义中若包含CQ码，可用此原型方法查看
Function.prototype.view = function () {
    return this.toString().replace(/[&\[\]]/g, (s) => {
        if (s === "&") return "&amp;"
        if (s === "[") return "&#91;"
        if (s === "]") return "&#93;"
    })
}

delete globalThis
delete console

const contextify = (o) => {
    const contextified = []
    const tmp = (o) => {
        switch (typeof o) {
            case "object":
            case "function":
                if (o !== null) {
                    if (contextified.includes(o))
                        return
                    Object.freeze(o)
                    contextified.push(o)
                    for (let k of Reflect.ownKeys(o)) {
                        tmp(o[k])
                    }
                }
                break
            default:
                break
        }
    }
    tmp(o)
}

//环境变量
Object.defineProperty(this, "data", {
    configurable: false,
    enumerable: false,
    writable: true,
    value: {}
})

const error403 = this.error403 = new Error("403 forbidden")

//群数据库
this.database = this.database && typeof this.database === "object" ? this.database : {}
this.database = new Proxy(this.database, {
    get: (o, k) => {
        if (parseInt(k) !== this.data.group_id && !this.isMaster())
            throw error403
        if (!o.hasOwnProperty(k))
            o[k] = {}
        return o[k]
    },
    set: (o, k, v, r) => {
        throw error403
    },
    has: (o, k) => {
        throw error403
    },
    deleteProperty: (o, k) => {
        throw error403
    },
    defineProperty: (o, k, d) => {
        throw error403
    },
    ownKeys: (o) => {
        if (this.isMaster())
            return Reflect.ownKeys(o)
        throw error403
    },
    preventExtensions: (o) => {
        throw error403
    },
    setPrototypeOf: (o, prototype) => {
        throw error403
    }
})
Object.defineProperty(this, "database", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: this.database
})

// set历史记录
this.set_history = this.set_history && typeof this.set_history === "object" ? this.set_history : {}
this.set_history = new Proxy(this.set_history, {
    set: (o, k, v) => {
        if (!this.set_history_allowed)
            throw error403
        return Reflect.set(o, k, v)
    },
    has: (o, k) => {
        throw error403
    },
    deleteProperty: (o, k) => {
        throw error403
    },
    defineProperty: (o, k, d) => {
        throw error403
    },
    ownKeys: (o) => {
        if (this.isMaster())
            return Reflect.ownKeys(o)
        throw error403
    },
    preventExtensions: (o) => {
        throw error403
    },
    setPrototypeOf: (o, prototype) => {
        throw error403
    }
})
Object.defineProperty(this, "set_history", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: this.set_history
})
Object.defineProperty(this, "recordSetHistory", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: (k) => {
        if (k !== "data" && this.data.user_id) {
            try {
                this.set_history[k] = {
                    qq: this.data.user_id,
                    name: this.data.sender.nickname,
                    group: this.data.group_id,
                    gname: this.data.group_name !== undefined ? this.data.group_name : undefined,
                    card: this.data.group_id ? this.data.sender.card : undefined,
                    time: Date.now()
                }
            } catch (e) {
            }
        }
    }
})

//主人qq 必须是包含qq号的字符串
// if (typeof this.master !== "string")
//     this.master = ""

Object.defineProperty(this, "isMaster", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: () => {
        return !this.data.user_id || this.master.includes(this.data.user_id)
    }
})
const isMaster = this.isMaster

// 钩子函数
if (typeof this.afterInit !== "function") //sandbox加载之后被执行
    this.afterInit = () => {
    }
if (typeof this.beforeExec !== "function") //用户代码执行之前被执行
    this.beforeExec = (code) => {
    }
if (typeof this.afterExec !== "function") //用户代码执行之后被执行
    this.afterExec = (res) => {
    }
if (typeof this.onEvents !== "function") //所有QQ事件
    this.onEvents = () => {
    }
if (typeof this.beforeApiCalled !== "function") //根据原有的代码可能会有这么一个函数，在调用CallApi之前执行
    this.beforeApiCalled = (params) => {
    }
// 受保护属性只有主人可以设置和删除
// 默认的受保护属性为 master,beforeExec,afterExec,onEvents 四个
// 受保护属性不能是引用类型(对象&数组)，只能是基础类型或函数，否则无法被保护
this.protected_properties = this.protected_properties && typeof this.protected_properties === "object" ? this.protected_properties : ["master", "afterInit", "beforeExec", "afterExec", "onEvents", "beforeApiCalled"]
this.protected_properties = new Proxy(this.protected_properties, {
    set: (o, k, v) => {
        if (this.isMaster())
            return Reflect.set(o, k, v)
        throw error403
    },
    deleteProperty: (o, k) => {
        if (this.isMaster())
            return Reflect.deleteProperty(o, k)
        throw error403
    },
    defineProperty: (o, k, d) => {
        throw error403
    },
    preventExtensions: (o) => {
        throw error403
    },
    setPrototypeOf: (o, prototype) => {
        throw error403
    }
})
Object.defineProperty(this, "protected_properties", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: this.protected_properties
})
Object.defineProperty(this, "isProtected", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: (k) => {
        return this.protected_properties.includes(k)
    }
})
const isProtected = this.isProtected

/*
五个主要变量：
● this.master ※主人qq列表(字符串，默认是被保护的)，使用this.isMaster()判断是否主人
● this.data ※环境变量
● this.database ※群数据库
● this.set_history ※变量定义历史记录
● this.protected_properties ※受保护的变量(只有master可以修改，this.isProtected()判断是被保护)

钩子事件函数(默认是被保护的，只有master可以修改)：
● this.afterInit() ※sandbox加载之后被执行
● this.beforeExec(code) ※执行用户代码之前执行，code是用户代码(如果该函数中抛出未捕获的错误，则用户代码不会被不会执行)
● this.afterExec(res) ※执行用户代码之后执行，res是用户代码执行结果(如果用户代码中抛出未捕获的错误，该函数不会被执行)
● this.onEvents() ※所有qq事件
*/
