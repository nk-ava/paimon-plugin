import fetch from "node-fetch"
import fs from "node:fs"
import os from "os"
import path from "path";
import {promisify} from "util"
import stream from "stream"
import Plugin from "../../../lib/plugins/plugin.js"
import {exec} from "child_process"
import md5 from "md5"
import {VideoDownloadTransform} from "oicq";

const TMP_DIR = os.tmpdir()
const PipeLine = promisify(stream.pipeline)

export class bilibili extends Plugin {
    constructor() {
        super({
            name: "bili",
            dsc: "返回b站视频",
            event: 'message',
            priority: '200',
            rule: [
                {
                    reg: '^(M_onlyPm_)?(\\[[\\s\\S]*\\])?BV(.)*',
                    fnc: 'biliVideo'
                },
                {
                    reg: "^(M_onlyPm_)?(\\[[\\s\\S]*\\])?[\\s\\S]*https:\\/\\/b23\\.tv\\/[\\s\\S]+",
                    fnc: 'btv'
                }
            ]
        });
    }

    async biliVideo(e) {
        let msg = e.msg.replace("M_onlyPm_", "")
        let bvId = msg.match(/BV(.*)/)[0]
        let args = msg.match(/\[[\s\S]*\]/)?.[0].slice(1, -1)
        let pI = 1
        if (args) {
            args = args?.split("-")
            args.forEach(a => {
                let m = a.trim()
                if (!m) return
                if (/^P\d+$/.test(m)) {
                    pI = a.trim().match(/\d+/)[0]
                }
            })
        }
        let rsp = (await (await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`)).json())?.data
        let pages = rsp?.pages
        if (!pages) {
            logger.info(`无效的bvid：${bvId}`)
            return true
        }
        if (pI < 1) {
            e.reply("无效的参数P")
            return true
        }
        if (pI > pages.length) {
            e.reply(`此视频最多${pages.length}P`)
            return true
        }
        let cid = pages[pI - 1].cid
        let tmp_audio = path.join(TMP_DIR, `pmplugin-bili-audio-${md5(Date.now())}`)
        let tmp_video = path.join(TMP_DIR, `pmplugin-bili-video-${md5(Date.now())}`)
        try {
            let res = await fetch(`https://api.bilibili.com/x/player/playurl?cid=${cid}&otype=json&bvid=${bvId}&fnval=80`)
            res = await res.json()
            let videos = res?.data?.dash?.video
            let audios = res?.data?.dash?.audio
            let videoUrl = videos.filter(v => v?.id === 32 && v?.codecid === 7)[0]
            let audioUrl = audios[0]
            if (!videoUrl) {
                e.reply("出错了：没有找到相关的视频资源")
                return true
            }
            let video = await fetch(videoUrl.baseUrl, {
                method: 'get',
                headers: {
                    "Origin": "https://www.bilibili.com",
                    "Referer": `https://www.bilibili.com/video/${bvId}/`
                }
            })
            await PipeLine(video.body.pipe(new VideoDownloadTransform), fs.createWriteStream(tmp_video))
            let audio = await fetch(audioUrl.baseUrl, {
                method: 'get',
                headers: {
                    "Origin": "https://www.bilibili.com",
                    "Referer": `https://www.bilibili.com/video/${bvId}/`
                }
            })
            await PipeLine(audio.body, fs.createWriteStream(tmp_audio))
        } catch {
            e.reply(segment.image(rsp.pic))
            fs.unlink(tmp_video, () => {
            })
            fs.unlink(tmp_audio, () => {
            })
            return true
        }
        let tmp_output = path.join(TMP_DIR, `pmplugin-bili-output-${md5(Date.now())}.mp4`)
        exec(`ffmpeg -i ${tmp_video} -i ${tmp_audio} -vcodec copy -acodec copy ${tmp_output}`, async (err, stdout, stderr) => {
            if (!fs.existsSync(tmp_output)) {
                logger.error(stderr)
            } else {
                await (e.friend || e.group).sendFile(`${tmp_output}`)
                e.reply(`共${pages.length}P，当前第${pI}P`, true)
                fs.unlink(tmp_output, () => {
                })
            }
            fs.unlink(tmp_video, () => {
            })
            fs.unlink(tmp_audio, () => {
            })
        })
    }

    async btv(e) {
        let msg = e.msg.replace("M_onlyPm_", "")
        let fetchUrl = msg.match(/https:\/\/b23\.tv\/[a-zA-Z0-9]*/)[0]
        let args = msg.match(/\[[\s\S]*\]/)?.[0] || ""
        let res = await fetch(fetchUrl, {
            method: 'get',
            redirect: 'manual'
        })
        let location = res.headers.get("location")
        if (!location) {
            return true
        }
        let bvId = location.match(/\/BV[^\?]+/)?.[0]?.replace("/", "")
        if (!bvId) return true
        e.msg = args + bvId
        return this.biliVideo(e)
    }
}