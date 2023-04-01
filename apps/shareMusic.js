import fetch from "node-fetch";
import Plugin from "../../../lib/plugins/plugin.js";
import {SendPm, buildMusic} from "../components/index.js";

let selfUid = Bot.uin;

export class shareMusic extends Plugin {
    constructor(e) {
        super({
            name: '点歌',
            dsc: '派蒙插件点歌',
            event: 'message',
            priority: '100',
            rule: [
                {
                    reg: '^(M_onlyPm_)?#点歌(.*)$',
                    fnc: 'chooseSong'
                }
            ]
        });
    }

    //接收json消息
    async accept(e) {
        if (e.from_id === selfUid && e.isPrivate) {
            let mss = e.message[0];
            let data = mss.data;
            let js = JSON.parse(data);
            let s = js.prompt.replace("[音乐分享] ", "");
            let count = await redis.lPush(`Music:share-key:${s}`, data);
            Bot.logger.mark(`新增相关歌曲：${s}`);
            if (count === 4) {
                Bot.em(`musicShare.${s}`);
            }
            return true;
        }
        return false;
    }

    //支持点歌
    async chooseSong(e) {
        let t = e.friend || e.group;
        let msg = e.msg.replace("M_onlyPm_", "");
        let song = msg.replace("#点歌", "");
        song = song.trim();
        if (!song) {
            e.reply("命令格式为；\n#点歌 <搜索关键字>");
            return true;
        }
        let songInfo = await redis.lRange(`Music:share-key:${song}`, 0, -1);
        if (songInfo.length === 0) {
            let url = `http://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${song}&type=1&offset=0&total=true&limit=4`;
            let rs = await (await fetch(url, {method: "get"})).json();
            songInfo = await toPreserve(rs, song);
        }
        if (songInfo.length === 0) {
            e.reply("点歌失败，请稍后再试！！");
            return true;
        }
        let fake = [];
        for (let i = 0; i < 4; i++) {
            fake[i] = {
                nickname: Bot.nickname,
                user_id: selfUid,
                message: {
                    type: "json",
                    data: songInfo[3 - i],
                }
            }
        }
        fake.push({
            nickname: Bot.nickname,
            user_id: selfUid,
            message: [{
                type: "text",
                text: "派蒙只推荐这四首",
            }, segment.image(SendPm("哼"))]
        })
        let xl = await t.makeForwardMsg(fake);
        e.reply(xl);
        return true;
    }

}

async function toPreserve(rs, song) {
    return new Promise((resolve, reject) => {
        let deal = async () => {
            await redis.expire(`Music:share-key:${song}`, 15 * 24 * 3600);
            let songInfo = await redis.lRange(`Music:share-key:${song}`, 0, -1);
            clearTimeout(timer);
            resolve(songInfo);
        }
        sendSelfMusic("163", rs.result.songs[0].id, song);
        sendSelfMusic("163", rs.result.songs[1].id, song);
        sendSelfMusic("163", rs.result.songs[2].id, song);
        sendSelfMusic("163", rs.result.songs[3].id, song);
        Bot.once(`musicShare.${song}`, deal)
        let timer = setTimeout(async () => {
            await redis.del(`Music:share-key:${song}`);
            Bot.off(`musicShare.${song}`, deal);
            resolve([]);
        }, 5000);
    })
}

async function sendSelfMusic(platform, id, key) {
    const body = await buildMusic(selfUid, platform, id, 0, key);
    await Bot.sendOidb("OidbSvc.0xb77_9", core.pb.encode(body));
}
