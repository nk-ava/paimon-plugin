import fetch from "node-fetch";
import lodash from "lodash";
import md5 from "md5";

function getHeaders(type, query = null, body = null) {
    if (type === "sign") {
        return {
            "Host": "api-takumi.mihoyo.com",
            "Connection": "keep-alive",
            "Accept": "application/json, text/plain, */*",
            'x-rpc-app_version': '2.37.1',
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; HLK-AL10 Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/537.36 miHoYoBBS/2.46.1',
            'x-rpc-client_type': 5,
            'x-rpc-device_id': '8642b132-87b3-30b3-a4e7-361e487e568b',
            'Origin': 'https://webstatic.mihoyo.com',
            'X-Requested-With': 'com.mihoyo.hyperion',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Referer': 'https://webstatic.mihoyo.com/bbs/event/signin/bh3/index.html?bbs_auth_required=true&act_id=e202207181446311&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Ds': sign.getDsSign()
        }
    }
    return {
        'Host': 'api-takumi-record.mihoyo.com',
        'Connection': 'keep-alive',
        'x-rpc-challenge': 'null',
        'Accept': 'application/json, text/plain, */*',
        'DS': sign.getDs(query, null),
        'x-rpc-app_version': '2.46.1',
        'x-rpc-page': '/bh3',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; HLK-AL10 Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/537.36 miHoYoBBS/2.46.1',
        'x-rpc-client_type': 5,
        'Origin': 'https://webstatic.mihoyo.com',
        'X-Requested-With': 'com.mihoyo.hyperion',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://webstatic.mihoyo.com/app/community-game-records/?bbs_presentation_style=fullscreen&bbs_auth_required=true&v=101&gid=1&user_id=288321425&game_id=1&uid=288321425',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': "cookie_token_v2=v2_2k1f-9MTTAWldqwr2iYd_kcxfQFl85ptBBBSBalfaHNQilcTp1yB-NLmXiUjL-9uyWGvQ2UJcD6wA-MzYQAPAu_BPnCtdNBNKifsgs4Olv4Fd3J0E9r5Hg==; account_mid_v2=03pm6u5y16_mhy; account_id_v2=288321425; ltoken_v2=v2_nh8-bY1Vw9TR_BiQhopv9Tkxf7VkJqMjZ3YlwMVrrbttyuwOVXRyXfuW2YmmhoByaJ29EaYAxeG8dGmT95pQSopPQfJwk-ff2A==; ltmid_v2=03pm6u5y16_mhy; ltuid_v2=288321425;"
    }
}

const sign = {
    getDsSign() {
        const n = 'Qqx8cyv7kuyD8fTw11SmvXSFHp7iZD29'
        const t = Math.round(new Date().getTime() / 1000)
        const r = lodash.sampleSize('abcdefghijklmnopqrstuvwxyz0123456789', 6).join('')
        const DS = md5(`salt=${n}&t=${t}&r=${r}`)
        return `${t},${r},${DS}`
    },
    getDs(q = null, b = null) {
        const n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
        const t = Math.round(new Date().getTime() / 1000)
        const r = Math.floor(Math.random() * 900000 + 100000)
        const DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`)
        return `${t},${r},${DS}`
    }
}