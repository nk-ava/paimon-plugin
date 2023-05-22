import fetch from "node-fetch";
import Plugin from "../../../lib/plugins/plugin.js";
import {SendPm, buildMusic, fetchQrCode, getSongs} from "../components/index.js";
import {Cfg} from "../components/index.js"

const selfUid = Bot.uin;
const availablePf = {"网易云": "163", "QQ": "qq", "酷狗": "kugou", "酷我": "kuwo"}
const retMap = new Map
let ckLock = false

export class shareMusic extends Plugin {
    constructor(e) {
        super({
            name: '点歌',
            dsc: '派蒙插件点歌',
            event: 'message',
            priority: '100',
            rule: [
                {
                    reg: '^(M_onlyPm_)?#?(酷狗|酷我|QQ|网易云)?点歌\\d*\\s(.*)$',
                    fnc: 'chooseSong'
                },
                {
                    reg: '^(M_onlyPm_)?#派蒙设置点歌数量\\d+',
                    fnc: 'setLimit',
                    permission: 'master'
                },
                {
                    reg: '^(M_onlyPm_)?#派蒙设置点歌平台(.)+',
                    fnc: 'setPlatform',
                    permission: "master"
                },
                {
                    reg: '^(M_onlyPm_)?#登入(qq|QQ)音乐',
                    fnc: 'loginQQMusic'
                }
            ]
        });

        this.cfg = Cfg.get("music")
        if (!this.cfg) {
            Cfg.set("music", {
                "platform": "163",
                "limit": 4,
                "cookie": {
                    "qq": {}
                }
            })
            this.cfg = Cfg.get("music")
        }
    }

    //接收json消息
    async accept(e) {
        if (e.from_id === selfUid && e.isPrivate) {
            let mss = e.message[0];
            let data = mss.data;
            let js = JSON.parse(data);
            let s = js.prompt.replace(/\[(.)*\]\s/, "");
            let platform
            if (js.prompt.includes("网易")) {
                platform = "163"
            } else if (js.prompt.includes("QQ")) {
                platform = "qq"
            } else if (js.prompt.includes("酷狗")) {
                platform = "kugou"
            } else if (js.prompt.includes("酷我")) {
                platform = "kuwo"
            }
            let count = await redis.lPush(`Music:share-key:${platform}-${s}`, data);
            Bot.logger.mark(`新增相关歌曲：${platform}-${s}`);
            if (count === retMap.get(`${platform}-${s}`)) {
                retMap.delete(`${platform}-${s}`)
                Bot.em(`musicShare.${platform}-${s}`);
            }
            return true;
        }
        return false;
    }

    //支持点歌
    async chooseSong(e) {
        let t = e.friend || e.group
        let msg = e.msg?.replace("M_onlyPm_", "");
        let args = msg.split(/\s/)[0].replace(/^#/, "").split("点歌")
        let song = msg.replace(/#?(酷狗|酷我|QQ|网易云)?点歌[^\s]*/, "").trim();
        if (!song) {
            e.reply("命令格式为；\n#点歌 <搜索关键字>");
            return true;
        }
        let limit, platform
        try {
            limit = Number(args[1])
            if (limit < 1 || isNaN(limit)) limit = this.cfg.limit
            if (limit > 10) {
                e.reply("太多了，派蒙处理不过来啦")
                return true
            }
        } catch {
            limit = this.cfg.limit
        }
        if (args[0] && Object.keys(availablePf).includes(args[0])) platform = availablePf[args[0]]
        else if (args[0]) {
            e.reply("不支持的平台类型")
            return true
        } else {
            platform = this.cfg.platform
        }
        let songInfo = await redis.lRange(`Music:share-key:${platform}-${song}`, -1 * limit, -1) || [];
        if (songInfo.length < limit) {
            if (platform === "163") {
                let url = `http://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${song}&type=1&offset=${songInfo.length}&total=true&limit=${limit - songInfo.length}`;
                let rs = await (await fetch(url, {method: "get"})).json();
                songInfo = [...(await toPreserve(rs.result.songs, song, platform, limit)), ...songInfo];
            } else if (platform === "kuwo") {
                let cur_cnt = songInfo.length
                let url = `http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${song}&pn=1&rn=${limit}`
                let rs = await (await fetch(url, {
                    method: 'get',
                    headers: {
                        "Referer": 'http://www.kuwo.cn/search/list?key=%E5%A4%A9%E4%B8%8B%E6%9C%89%E6%83%85%E4%BA%BA',
                        "CSRF": 'YFAKEYZ5EBO',
                        "Cookie": 'kw_token=YFAKEYZ5EBO;'
                    }
                })).json()
                rs = rs.data.list.slice(cur_cnt)
                songInfo = [...(await toPreserve(rs, song, platform, limit)), ...songInfo]
            } else if (platform === "kugou") {
                let cur_cnt = songInfo.length
                let url = `http://mobilecdn.kugou.com/api/v3/search/song?keyword=${song}&page=1&pagesize=${limit}`
                let rs = await (await fetch(url, {method: 'get'})).json()
                rs = rs.data.info.slice(cur_cnt)
                songInfo = [...(await toPreserve(rs, song, platform, limit)), ...songInfo]
            } else if (platform === "qq") {
                let cur_cnt = songInfo.length
                let ck = this.cfg.cookie.qq
                if (!ck?.ck || !ck?.uin) {
                    e.reply("qq音乐点歌需要登入，请发送【#登入QQ音乐】完成登入")
                    return
                }
                let rs = await getSongs(song, 1, limit, ck.uin, ck.ck)
                if (rs.includes("出错了")) {
                    e.reply(rs)
                    return true
                }
                rs = rs.slice(cur_cnt)
                songInfo = [...(await toPreserve(rs, song, platform, limit)), ...songInfo]
            }
        }
        if (songInfo.length === 0) {
            e.reply("点歌失败，请稍后再试！！");
            return true;
        }
        if (songInfo.length !== 1) {
            let fake = [];
            for (let i = 0; i < limit; i++) {
                fake[i] = {
                    nickname: Bot.nickname,
                    user_id: selfUid,
                    message: {
                        type: "json",
                        data: songInfo[limit - 1 - i],
                    }
                }
            }
            fake.push({
                nickname: Bot.nickname,
                user_id: selfUid,
                message: [{
                    type: "text",
                    text: "派蒙只推荐这几首",
                }, segment.image(SendPm("哼"))]
            })
            let xl = await t.makeForwardMsg(fake);
            e.reply(xl);
        } else {
            e.reply(segment.json(songInfo[0]))
        }
        return true;
    }

    setLimit(e) {
        let limit = e.msg.match(/\d/)[0]
        if (limit < 1 || limit > 10) {
            e.reply("只能是1到10的数字")
            return true
        }
        this.cfg.limit = Number(limit)
        Cfg.set("music", this.cfg)
        e.reply(`当前点歌数量：${this.cfg.limit}`)
        return true
    }

    setPlatform(e) {
        let platform = e.msg.replace(/^(M_onlyPm_)?#派蒙设置点歌平台/, "").trim()
        if (!Object.values(availablePf).includes(platform)) {
            e.reply(`不支持的点歌平台：${platform}`)
            return true
        }
        this.cfg.platform = platform
        Cfg.set("music", this.cfg)
        e.reply(`当前点歌平台：${this.cfg.platform}`)
        return true
    }

    async loginQQMusic(e) {
        if (!ckLock) {
            ckLock = true
            let ck = await fetchQrCode(e)
            if (ck.includes("出错了")) {
                e.reply(ck, true)
                return
            }
            let ckObj = {}
            ckObj.uin = Number(ck.match(/uin=\d+/)[0].replace("uin=", ""))
            ckObj.ck = ck
            this.cfg.cookie.qq = ckObj
            Cfg.set("music", this.cfg)
            ckLock = false
            e.reply("登入成功！")
        }
    }
}

async function toPreserve(songs, song, platform, limit) {
    return new Promise((resolve, reject) => {
        let deal = async () => {
            await redis.expire(`Music:share-key:${platform}-${song}`, 15 * 24 * 3600);
            let songInfo = await redis.lRange(`Music:share-key:${platform}-${song}`, -1 * limit, -1);
            clearTimeout(timer);
            resolve(songInfo);
        }
        retMap.set(`${platform}-${song}`, limit)
        songs.forEach(s => {
            sendSelfMusic(platform, s, song)
        })
        Bot.once(`musicShare.${platform}-${song}`, deal)
        let timer = setTimeout(async () => {
            await redis.del(`Music:share-key:${platform}-${song}`);
            Bot.off(`musicShare.${platform}-${song}`, deal);
            resolve([]);
        }, 5000);
    })
}

async function sendSelfMusic(platform, s, key) {
    const body = await buildMusic(selfUid, platform, s, 0, key);
    await Bot.sendOidb("OidbSvc.0xb77_9", core.pb.encode(body));
}
