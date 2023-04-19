import Plugin from "../../../lib/plugins/plugin.js";
import schedule from "node-schedule";
import {Cfg} from "../components/index.js";
import BrowserPuppeteer from "../components/models/BrowserPuppeteer.js";
import {jsonSign} from "./jsonSign.js";
import {help} from "./help.js";
import md5 from "md5";

let userQCnt = {}
let dayMap = ['日', '一', '二', '三', '四', '五', '六']
let typeMap = {
    "晴": 201,
    "多云": 202,
    "阴天": 203,
    "雨": 204,
    "雪": 205,
    "雾": 206,
    "沙尘": 207,
    "霾": 208
}

export class weather extends Plugin {
    constructor() {
        super({
            name: '天气',
            dsc: '查看天气',
            event: 'message',
            priority: 101,
            rule: [
                {
                    reg: '^(M_onlyPm_)?#?(.*)天气\\d?$',
                    fnc: 'tWeather'
                },
                {
                    reg: '^(M_onlyPm_)?#?天气设置(.*)',
                    fnc: 'setPos'
                },
                {
                    reg: '^(M_onlyPm_)?#派蒙设置天气卡片\\d+',
                    fnc: 'setCard',
                    permission: 'master'
                },
                {
                    reg: '^(M_onlyPm_)?#我的位置',
                    fnc: 'myPosition'
                }
            ]
        });
        this.cfg = Cfg.get("weather") || {}
    }

    init() {
        schedule.scheduleJob("0 0 0 * * ?", () => {
            userQCnt = {};
        })
        if (typeof this.cfg.limit === "undefined") {
            this.cfg.limit = 5;
            Cfg.set("weather", this.cfg);
        }
    }

    async tWeather(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        msg = msg.replace("#", "");
        msg = msg.split("天气");
        let position = msg[0];
        let d = msg[1] || 0;
        try {
            d = Number(d) + 1;
        } catch (err) {
            e.reply("请正确输入");
            return true;
        }
        if (!position) {
            //根据配置信息查询
            position = this.cfg?.user?.[e.user_id];
            if (!position) {
                e.reply("请发送【#天气设置北京】设置查询位置")
                return true;
            }
        } else {
            position = await getPosition(position)
            if (position.includes("出错了")) {
                e.reply(position);
                return true;
            }
        }
        if (d > 7) {
            e.reply("派蒙找不到这天的天气了");
            return true;
        }
        let p = position.split(",").map(m => m.trim());
        if ((userQCnt[e.user_id] || 0) < this.cfg.limit) {
            let info = await getWeatherInfo(p, d);
            let date = new Date();
            date.setDate(date.getDate() + (d - 1));
            date = `${date.getMonth() + 1}月${date.getDate()}日 周${dayMap[date.getDay()]}`
            let body = {
                app: "com.tencent.weather",
                desc: '天气',
                view: 'RichInfoView',
                ver: '0.0.0.1',
                prompt: '[重要] 派蒙天气',
                config: {
                    type: 'normal',
                    showSender: 1,
                    token: md5(`${new Date().getTime()}`)
                },
                meta: {
                    richinfo: {
                        adcode: '',
                        city: p.join(""),
                        date: date,
                        max: info.max,
                        min: info.min,
                        type: `${Object.entries(typeMap).filter(a => info.observe['weather'].includes(a[0]))[0][1]}`,
                        wind: `${Number(info.observe['wind_power']) - 3}`,
                        ts: `${new Date().getTime()}`
                    }
                }
            }
            let uid, type;
            if (e.isGroup) {
                uid = e.group_id
                type = 1
            } else {
                uid = e.user_id
                type = 0
            }
            await jsonSign.sendJson(uid, type, body)
            userQCnt[e.user_id] = Number(userQCnt[e.user_id] || 0) + 1;
        } else {
            let children = `<li class="item" data-province="${p[0] || ''}" data-city="${p[1] || ''}" data-district="${p[2] || ''}"></li>`
            e.reply(await BrowserPuppeteer.screenshot("weather", {
                jumpUrl: 'https://tianqi.qq.com/index.htm',
                selector: "div",
                saveName: `${e.user_id}`,
                pageScript: async (args) => {
                    let ele = document.querySelector("#ls-match");
                    ele.innerHTML = args[0];
                    ele.children[0].click();
                    // 等待更新页面
                    await new Promise(((resolve, reject) => {
                        setTimeout(() => resolve(), 500)
                    }))
                    let ct = document.querySelector("#ct-footer");
                    ct.parentNode.removeChild(ct);
                },
                args: [children]
            }))
        }
    }

    async setPos(e) {
        if (!this.cfg.user) this.cfg.user = {};
        let msg = e.msg?.replace("M_onlyPm_", "");
        let position = msg.replace(/#?天气设置/g, "");
        if (!!!position) {
            e.reply('请正确输入位置');
            return true;
        }
        position = await getPosition(position)
        if (position.includes("出错了")) {
            e.reply(position);
            return true
        }
        this.cfg.user[e.user_id] = position;
        Cfg.set("weather", this.cfg);
        e.reply("设置成功，直接发送【#天气】将默认查询此位置天气")
        return true;
    }

    async setCard(e) {
        let msg = e.msg?.replace("M_onlyPm_", "");
        let limit = msg.replace(/#派蒙设置天气卡片/g, "");
        try {
            limit = Number(limit);
        } catch (err) {
            e.reply("请正确输入数量");
            return true;
        }
        this.cfg.limit = limit;
        Cfg.set("weather", this.cfg);
        e.reply(await help.cfgInfo());
        return true;
    }

    myPosition(e) {
        if (this.cfg?.user?.[e.user_id]) {
            e.reply(this.cfg?.user?.[e.user_id]);
        } else {
            e.reply("你没有设置位置，请发送【#天气设置】设置位置");
        }
        return true;
    }
}

async function getWeatherInfo(key, date) {
    let res = await fetch(`https://wis.qq.com/weather/common?source=pc&weather_type=observe|forecast_24h&province=${key[0] || ""}&city=${key[1] || ""}&county=${key[2] || ""}`, {
        method: 'get'
    })
    if (!res.ok) {
        return "出错了：接口错误"
    }
    res = await res.json()
    if (!Object.keys(res?.data?.observe).length) {
        return "出错了：派蒙找不到这个位置的天气"
    }
    let observe = {}
    if (date === 1) observe = res?.data?.observe;
    else {
        observe['weather'] = res?.data?.["forecast_24h"]?.[date]?.['day_weather'];
        observe['wind_power'] = res?.data?.["forecast_24h"]?.[date]?.['day_wind_power'];
    }
    return {
        observe: observe,
        max: res?.data?.["forecast_24h"][date]['max_degree'],
        min: res?.data?.["forecast_24h"][date]['min_degree']
    }
}

async function getPosition(key) {
    let province, city, area;
    if (key.includes(",")) {
        let a = key.split(",");
        province = a[0] || "";
        city = a[1] || "";
        area = a[2] || "";
    } else {
        city = key
    }
    // console.log(0, province, 1, city, 2, area);
    let res = await fetch(`https://wis.qq.com/city/like?source=pc&city=${area || city || province}`, {
        method: 'get'
    });
    if (!res.ok) {
        return "出错了：接口出错了";
    }
    res = await res.json();
    res = Object.entries(res?.data)?.[0];
    if (!res) {
        return "出错了：派蒙没有找到这个位置"
    }
    return res[1];
}