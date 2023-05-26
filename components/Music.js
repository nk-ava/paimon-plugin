import fetch from "node-fetch"
import querystring from "querystring"
import md5 from "md5"

async function getQQSong(s) {
    // let rsp = await fetch.get(`https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&data={"comm":{"ct":24,"cv":0},"songinfo":{"method":"get_song_detail_yqq","param":{"song_type":0,"song_mid":"","song_id":${s.id}},"module":"music.pf_song_detail_svr"}}`, {responseType: "json"});
    // rsp = (await rsp.json()).songinfo.data.track_info;
    // let mid = rsp.mid, title = rsp.name, album = rsp.album.mid, singer = rsp.singer?.[0]?.name || "unknown";
    let rsp = await fetch(`http://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=2034008533&uin=0&format=json&data={"comm":{"ct":23,"cv":0},"url_mid":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"4311206557","songmid":["${s.mid}"],"songtype":[0],"uin":"0","loginflag":1,"platform":"23"}}}&_=1599039471576`, {method: 'get'});
    rsp = (await rsp.json()).url_mid.data.midurlinfo[0];
    return {
        title: s.name,
        singer: s.singer?.[0]?.name || "unknown",
        jumpUrl: `https://i.y.qq.com/v8/playsong.html?platform=11&appshare=android_qq&appversion=10030010&hosteuin=oKnlNenz7i-s7c**&songmid=${s.mid}&type=0&appsongtype=1&_wv=1&source=qq&ADTAG=qfshare`,
        musicUrl: rsp.purl,
        preview: `http://y.gtimg.cn/music/photo_new/T002R180x180M000${s.album.mid}.jpg`,
    };
}

async function get163Song(s) {
    let rsp = await fetch(`http://music.163.com/api/song/detail/?id=${s.id}&ids=[${s.id}]`, {
        method: 'get',
        responseType: "json"
    });
    rsp = (await rsp.json()).songs[0];
    return {
        title: rsp.name,
        singer: rsp.artists[0].name,
        jumpUrl: "https://y.music.163.com/m/song/" + s.id,
        musicUrl: "http://music.163.com/song/media/outer/url?id=" + s.id,
        preview: rsp.album.picUrl,
    };
}

async function getMiGuSong(id) {
    let rsp = await fetch.get(`https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do?copyrightId=${id}&resourceType=2`, {responseType: "json"});
    rsp = (await rsp.json()).resource[0];
    let preview = "";
    try {
        let a = await fetch.get(`https://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${rsp.songId}`, {
            responseType: "json",
            headers: {referer: "https://music.migu.cn/v3/music/player/audio"}
        });
        preview = (await a.json()).smallPic || "";
    } catch {
    }
    let url = await fetch.get(`https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/shareInfo.do?contentId=${rsp.contentId}&contentName=${rsp.songName}&resourceType=2&targetUserName=${rsp.singer}`, {responseType: "json"});
    let jumpUrl = (await url.json()).url || "http://c.migu.cn/";
    return {
        title: rsp.songName,
        singer: rsp.singer,
        jumpUrl,
        musicUrl: rsp.newRateFormats ? rsp.newRateFormats[0].url.replace(/ftp:\/\/[^/]+/, "https://freetyst.nf.migu.cn") : rsp.rateFormats[0].url.replace(/ftp:\/\/[^/]+/, "https://freetyst.nf.migu.cn"),
        preview: preview || "",
    };
}

async function getKuGouSong(s) {
    let url = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&callback=&hash=${s.hash}&dfid=&mid=${s.hash}&platid=4&_=${+new Date()}&album_id=`;
    // let rsp = await fetch(url, {method: 'get'});
    // rsp = (await rsp.json()).data;
    url += s.album_id;
    let rsp = await fetch(url, {method: 'get'});
    rsp = (await rsp.json()).data;
    return {
        title: rsp.audio_name,
        singer: rsp.author_name,
        jumpUrl: `https://www.kugou.com/song/#hash=${s.hash}&album_id=${rsp.album_id}`,
        musicUrl: rsp.play_url || "https://webfs.yun.kugou.com",
        preview: rsp.img,
    };
}

async function getKuwoSong(s) {
    // let rsp = await fetch(`http://yinyue.kuwo.cn/api/www/music/musicInfo?mid=${id}&httpsStatus=1`, {
    //     method: 'get',
    //     headers: {csrf: id, cookie: "kw_token=" + id}
    // });
    // rsp = (await rsp.json()).data;
    let url = await fetch(`https://www.kuwo.cn/api/v1/www/music/playUrl?mid=${s.rid}&type=music`, {method: 'get'});
    return {
        title: s.name,
        singer: s.artist,
        jumpUrl: "http://yinyue.kuwo.cn/play_detail/" + s.rid,
        musicUrl: (await url.json())?.data?.url || "https://win-web-ra01-sycdn.kuwo.cn",
        preview: s.pic,
    };
}

/** 构造b77音乐分享 */
async function buildMusic(target, platform, s, bu, key) {
    let appid, appname, appsign, style = 4;
    let pw
    try {
        if (platform === "qq") {
            appid = 100497308, appname = "com.tencent.qqmusic", appsign = "cbd27cd7c861227d013a25b2d10f0799";
            var {singer, title, jumpUrl, musicUrl, preview} = await getQQSong(s);
            pw = "[QQ音乐分享] "
            if (!musicUrl)
                style = 0;
        } else if (platform === "163") {
            appid = 100495085, appname = "com.netease.cloudmusic", appsign = "da6b069da1e2982db3e386233f68d76d";
            var {singer, title, jumpUrl, musicUrl, preview} = await get163Song(s);
            pw = "[网易音乐分享] "
        } else if (platform === "migu") {
            appid = 1101053067, appname = "cmccwm.mobilemusic", appsign = "6cdc72a439cef99a3418d2a78aa28c73";
            var {singer, title, jumpUrl, musicUrl, preview} = await getMiGuSong(s);
            pw = "[咪咕音乐分享] "
        } else if (platform === "kugou") {
            appid = 205141, appname = "com.kugou.android", appsign = "fe4a24d80fcf253a00676a808f62c2c6";
            var {singer, title, jumpUrl, musicUrl, preview} = await getKuGouSong(s);
            pw = "[酷狗音乐分享] "
        } else if (platform === "kuwo") {
            appid = 100243533, appname = "cn.kuwo.player", appsign = "bf9ff4ffb4c558a34ee3fd52c223ebf5";
            var {singer, title, jumpUrl, musicUrl, preview} = await getKuwoSong(s);
            pw = "[酷我音乐分享] "
        } else {
            throw new Error("unknown music platform: " + platform);
        }
    } catch (e) {
        throw new Error("unknown music id: " + s.id || s.rid || s.hash + ", in platform: " + platform);
    }
    return {
        1: appid,
        2: 1,
        3: style,
        5: {
            1: 1,
            2: "0.0.0",
            3: appname,
            4: appsign
        },
        10: bu,
        11: target,
        12: {
            10: title,
            11: singer,
            12: pw + key,
            13: jumpUrl,
            14: preview,
            16: musicUrl,
        }
    };
}

function genToken(t) {
    for (var e = 0, n = 0, o = t.length; n < o; ++n)
        e += (e << 5) + t.charCodeAt(n);
    return 2147483647 & e
}

function middle(ls) {
    let resNum = []

    function test(a, b, c) {
        let r25 = a >> 2
        if (b !== undefined && c !== undefined) {
            let r26 = a & 3
            let r26_2 = r26 << 4
            let r26_3 = b >> 4
            let r26_4 = r26_2 | r26_3
            let r27 = b & 15
            let r27_2 = r27 << 2
            let r27_3 = r27_2 | (c >> 6)
            let r28 = c & 63
            resNum.push(r25)
            resNum.push(r26_4)
            resNum.push(r27_3)
            resNum.push(r28)
        } else {
            let r10 = a >> 2
            let r11 = a & 3
            let r11_2 = r11 << 4
            resNum.push(r10)
            resNum.push(r11_2)
        }
    }

    for (let i = 0; i < ls.length; i += 3) {
        if (ls[i] !== undefined && ls[i + 1] !== undefined && ls[i + 2] !== undefined) {
            test(ls[i], ls[i + 1], ls[i + 2])
        } else {
            test(ls[i], undefined, undefined)
        }
    }
    let res = []
    resNum.forEach((item) => {
        let zd = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
        res.push(zd[item])
    })
    res = res.join('')
    return res
}

function head(md5Str) {
    let res = [];
    [21, 4, 9, 26, 16, 20, 27, 30].map(x => {
        res.push(md5Str[x])
    })
    return res.join('')
}

function tail(md5Str) {
    let res = [];
    [18, 11, 3, 2, 1, 7, 6, 25].map(x => {
        res.push(md5Str[x])
    })
    return res.join('')
}

function getLs(md5Str) {
    let zd = {
        "0": 0,
        "1": 1,
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9,
        "A": 10,
        "B": 11,
        "C": 12,
        "D": 13,
        "E": 14,
        "F": 15
    }
    let ol = [212, 45, 80, 68, 195, 163, 163, 203, 157, 220, 254, 91, 204, 79, 104, 6]
    let res = []
    let j = 0
    for (let i = 0; i < md5Str.length; i += 2) {
        let one = zd[md5Str[i]]
        let two = zd[md5Str[i + 1]]
        let r = one * 16 ^ two
        res.push(r ^ ol[j])
        j += 1
    }
    return res
}

function getGTK(str) {
    let hash = 5381;
    for (let i = 0, len = str.length; i < len; ++i) {
        hash += (hash << 5) + str.charAt(i).charCodeAt(0);
    }
    return hash & 2147483647;
}

/** 构造qq音乐sign **/
function sign(params) {
    let md5Str = md5(params).toUpperCase()
    let h = head(md5Str)
    let e = tail(md5Str)
    let ls = getLs(md5Str)
    let m = middle(ls)
    let res = ('zzb' + h + m + e).toLowerCase()
    let r = RegExp(/[\\/+]/g)
    res = res.replace(r, '')
    return res
}

/** 刷新QQ音乐ck，参考https://github.com/xfdown/xiaofei-plugin/blob/a932d2001d61d085927d662ac7551f8a09d3fee7/apps/%E7%82%B9%E6%AD%8C.js#L24 **/
async function refresh_ck(ck) {
    let cookie = querystring.parse(ck.ck, "; ", "=")
    let create_time = (cookie["psrf_musickey_createtime"] || 0) * 1000
    if (Date.now() - create_time > 1000 * 60 * 60 * 12) {
        let res = await fetch("https://u.y.qq.com/cgi-bin/musicu.fcg", {
            method: 'post',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: JSON.stringify({
                "comm": {
                    "_channelid": "19",
                    "_os_version": "6.2.9200-2",
                    "authst": "",
                    "ct": "19",
                    "cv": "1891",
                    "patch": "118",
                    "psrf_access_token_expiresAt": 0,
                    "psrf_qqaccess_token": "",
                    "psrf_qqopenid": "",
                    "psrf_qqunionid": "",
                    "tmeAppID": "qqmusic",
                    "tmeLoginType": 2,
                    "uin": "0",
                    "wid": "0"
                },
                "req_0": {
                    "method": "Login",
                    "module": "music.login.LoginServer",
                    "param": {
                        "appid": 100497308,
                        "access_token": cookie['psrf_qqaccess_token'],
                        "expired_in": 0,
                        "forceRefreshToken": 0,
                        "musicid": ck.uin,
                        "musickey": cookie['qqmusic_key'] || cookie['qm_keyst'],
                        "onlyNeedAccessToken": 0,
                        "openid": cookie['psrf_qqopenid'],
                        "refresh_token": cookie['psrf_qqrefresh_token'],
                        "unionid": cookie['psrf_qqunionid']
                    }
                }
            })
        })
        if (!res.ok) {
            return false
        }
        res = await res.json()
        if (res.req_0?.code !== 0) {
            return false
        }
        let data = res.req_0?.data
        cookie["psrf_qqopenid"] = data.openid
        cookie["psrf_qqrefresh_token"] = data.refresh_token
        cookie["psrf_qqaccess_token"] = data.access_token
        cookie["psrf_access_token_expiresAt"] = data.expired_at
        cookie["uin"] = String(data.str_musicid || data.musicid)
        cookie["qqmusic_key"] = data.musickey
        cookie["qm_keyst"] = data.musickey
        cookie["psrf_musickey_createtime"] = data.musickeyCreateTime
        cookie["psrf_qqunionid"] = data.unionid
        cookie["euin"] = data.encryptUin
        cookie["login_type"] = 1
        cookie["tmeLoginType"] = 2
        return querystring.stringify(cookie, "; ", "=")
    } else {
        return false
    }
}

/** qq音乐搜歌 **/
async function getSongs(key, p, n, uin, ck) {
    let body = {
        "comm": {
            "cv": 4747474,
            "ct": 24,
            "format": "json",
            "inCharset": "utf-8",
            "outCharset": "utf-8",
            "notice": 0,
            "platform": "yqq.json",
            "needNewCode": 1,
            "uin": uin,
            "g_tk_new_20200303": 1891213265,
            "g_tk": 1891213265
        },
        "req_1": {
            "method": "DoSearchForQQMusicDesktop",
            "module": "music.search.SearchCgiService",
            "param": {
                "remoteplace": "txt.yqq.center",
                "searchid": "56466708186451402",
                "search_type": 0,
                "query": key,
                "page_num": p,
                "num_per_page": n
            }
        }
    }
    let url = `https://u.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${sign(JSON.stringify(body))}`
    let res = await fetch(url, {
        method: 'post',
        headers: {
            "Cookie": ck,
            "Origin": "https://y.qq.com",
            "Referer": "https://y.qq.com/"
        },
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        return "出错了：接口错误"
    }
    res = await res.json()
    res = res?.['req_1']?.data?.body?.song?.list
    if (!res) {
        return "出错了：未获取到歌曲"
    }
    return res
}

/** qq音乐扫码登入 **/
async function fetchQrCode(e) {
    let res = await fetch(`https://ssl.ptlogin2.qq.com/ptqrshow?appid=716027609&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}&daid=383&pt_3rd_aid=100497308&u1=https%3A%2F%2Fgraph.qq.com%2Foauth2.0%2Flogin_jump`, {method: 'get'})
    let cookie = res.headers.get('set-cookie').match(/qrsig=[^;]+;/)[0]
    let buf = Buffer.from(await res.arrayBuffer()).toString('base64')
    e.reply(['请尽快扫码，不然会过期的。注：本次扫码不能使用长按识别', segment.image(`base64://${buf}`)])
    let token = genToken(cookie.replace("qrsig=", "").replace(";", ""))
    return new Promise(resolve => {
        if (cookie) {
            let timer = setInterval(async () => {
                let rs = await fetch(`https://ssl.ptlogin2.qq.com/ptqrlogin?u1=https%3A%2F%2Fgraph.qq.com%2Foauth2.0%2Flogin_jump&ptqrtoken=${token}&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${Date.now()}&js_ver=23050617&js_type=1&login_sig=&pt_uistyle=40&aid=716027609&daid=383&pt_3rd_aid=100497308&has_onekey=1&&o1vId=c24696018ee72e9665e2676a146fa69d&pt_js_version=17ca813a`, {
                    method: 'get',
                    headers: {
                        Cookie: cookie
                    }
                })
                let msg = await rs.text()
                if (msg.includes("二维码已失效")) {
                    clearInterval(timer)
                    resolve("出错了：二维码已失效")
                } else if (msg.includes("登录成功")) {
                    try {
                        let redirect_url = msg.match(/'https:\/\/[^']+'/)[0].replace(/'/g, "")
                        let rs = await fetch(redirect_url, {
                            method: 'get',
                            redirect: 'manual'
                        })
                        let s_key = ""
                        let authCk = rs.headers.get('set-cookie').split(";, ").map(c => {
                            let r = c.split(";")?.[0]
                            let i = r.indexOf("=")
                            if (i !== -1) {
                                let t = r.substr(i + 1)
                                if (t) {
                                    if (r.substr(0, i) === "p_skey") s_key = t
                                } else return ""
                            }
                            return r
                        }).filter(c => !!c.trim()).join("; ")
                        let res = await fetch("https://graph.qq.com/oauth2.0/authorize", {
                            method: 'post',
                            redirect: 'manual',
                            headers: {
                                Cookie: authCk,
                                Origin: 'https://graph.qq.com',
                                Referer: 'https://graph.qq.com/oauth2.0/show?which=Login&display=pc&response_type=code&client_id=100497308&redirect_uri=https%3A%2F%2Fy.qq.com%2Fportal%2Fwx_redirect.html%3Flogin_type%3D1%26surl%3Dhttps%3A%2F%2Fy.qq.com%2Fn%2Fryqq%2Fsearch%3Fw%3Dhopy%26t%3Dsong%26remoteplace%3Dtxt.yqq.center&state=state&display=pc&scope=get_user_info%2Cget_app_friends',
                                "Content-Type": 'application/x-www-form-urlencoded'
                            },
                            body: `response_type=code&client_id=100497308&redirect_uri=https%3A%2F%2Fy.qq.com%2Fportal%2Fwx_redirect.html%3Flogin_type%3D1%26surl%3Dhttps%3A%2F%2Fy.qq.com%2Fn%2Fryqq%2Fsearch%3Fw%3Dhopy%26t%3Dsong%26remoteplace%3Dtxt.yqq.center&scope=get_user_info%2Cget_app_friends&state=state&from_ptlogin=1&src=1&update_auth=1&openapi=1010_1030&g_tk=${getGTK(s_key)}`
                        })
                        let location = res.headers.get("location")
                        let code = location.match(/code=[^&]+/)[0].replace("code=", "")
                        let getCk = await fetch("https://u.y.qq.com/cgi-bin/musicu.fcg", {
                            method: 'post',
                            headers: {
                                "Origin": 'https://y.qq.com',
                                "Referer": 'https://y.qq.com/'
                            },
                            body: JSON.stringify({
                                "comm": {"platform": "yqq", "ct": 24, "cv": 0},
                                "req": {
                                    "module": "QQConnectLogin.LoginServer",
                                    "method": "QQLogin",
                                    "param": {"code": code}
                                }
                            })
                        })
                        let ck = getCk.headers.get("set-cookie")
                        ck = ck.split(";, ").map(c => {
                            return c.split(";")?.[0]
                        }).join("; ")
                        clearInterval(timer)
                        resolve(ck)
                    } catch (err) {
                        clearInterval(timer)
                        resolve("出错了：请求cookie出现错误")
                    }
                } else if (msg.includes("本次登录已被拒绝")) {
                    clearInterval(timer)
                    resolve("出错了：本次登录已被拒绝")
                }
            }, 1000)
        } else {
            resolve("出错了：未获取到cookie")
        }
    })
}

export {buildMusic, getSongs, fetchQrCode, refresh_ck}