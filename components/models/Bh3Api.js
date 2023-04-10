import lodash from "lodash";
import md5 from "md5";
import fetch from "node-fetch";

function getHeaders(type, query = "", body = "") {
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
            'DS': sign.getDsSign()
        }
    }
    return {
        'Host': 'api-takumi-record.mihoyo.com',
        'Connection': 'keep-alive',
        'x-rpc-challenge': 'null',
        'Accept': 'application/json, text/plain, */*',
        'DS': sign.getDs(query, body),
        'x-rpc-app_version': '2.37.1',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; HLK-AL10 Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/537.36 miHoYoBBS/2.46.1',
        'x-rpc-client_type': 5,
        'Origin': 'https://webstatic.mihoyo.com',
        'X-Requested-With': 'com.mihoyo.hyperion',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://webstatic.mihoyo.com',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
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
    getDs(q = "", b = "") {
        let n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
        let t = Math.round(new Date().getTime() / 1000)
        let r = Math.floor(Math.random() * 900000 + 100000)
        let DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`)
        return `${t},${r},${DS}`
    }
}

/**
 * 崩坏三每日签到接口
 * @param ck cookie
 * @param role 角色信息
 * @returns {Promise<string>}
 */
async function bh3DaySign(ck, role) {
    let url = "https://api-takumi.mihoyo.com/event/luna/sign";
    let body = {
        act_id: "e202207181446311",
        region: role.region,
        uid: role.uid,
        lang: "zh-cn"
    }
    let headers = getHeaders("sign");
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'post',
        headers: headers,
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        return "出错了：米游社接口出错";
    } else {
        res = await res.json();
        if (res.retcode !== 0) {
            return `出错了：${res.message}`;
        } else {
            if (!(await checkSigned(ck, role))) {
                return "出错了：崩三今日签到失败，请手动过验证";
            } else {
                return "崩三今日签到成功";
            }
        }
    }
}

/**
 * 检查崩坏三今日是否签到
 * @param ck cookie
 * @param role 查询角色
 * @returns {Promise<boolean|*>}
 */
async function checkSigned(ck, role) {
    let url = `https://api-takumi.mihoyo.com/event/luna/info?act_id=e202207181446311&region=${role.region}&uid=${role.uid}&lang=zh-cn`;
    let headers = getHeaders("sign");
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'get',
        headers: headers
    });
    if (!res.ok) {
        return false;
    } else {
        res = await res.json();
        return res?.data?.["is_sign"];
    }
}

/**
 * 根据cookie获取游戏角色信息
 * @param ck cookie
 * @returns {Promise<boolean|*>}
 */
async function getAllRoles(ck) {
    if (!ck) return false;
    let url = "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=bh3_cn"
    let headers = getHeaders("sign");
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'get',
        headers: headers,
    });
    if (!res.ok) {
        return false;
    } else {
        res = await res.json();
        return res?.data?.list;
    }
}

/**
 * 获取崩坏三游戏数据，暂时需要绑定cookie才能查询，因为不清楚崩坏三uid和服务器的关系
 * @param ck cookie
 * @param role 角色信息,包含uid和服务器
 * @returns {Promise<String|*>}
 */
async function getIndex(ck, role) {
    let url = "https://api-takumi-record.mihoyo.com/game_record/app/honkai3rd/api/index";
    let query = `role_id=${role.uid}&server=${role.region}`;
    url += "?" + query;
    let headers = getHeaders("index", query);
    headers["Cookie"] = ck;
    let res = await fetch(url, {
        method: 'get',
        headers: headers
    })
    if (!res.ok) {
        return "出错了：米游社接口出错";
    }
    res = await res.json();
    let ans = res?.data;
    if(!ans) return res.message;
    return  ans;
}

export default {bh3DaySign, checkSigned, getAllRoles, getIndex}