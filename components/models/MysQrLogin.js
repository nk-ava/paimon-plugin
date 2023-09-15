import qr from "qr-image";
import {promisify} from "util";
import fetch from "node-fetch";
import * as stream from "stream"
import fs from "node:fs";

async function fetchQrCode() {
    let res = await fetch("https://passport-api.miyoushe.com/account/ma-cn-passport/web/createQRLogin", {
        method: 'post',
        headers: getHeaders()
    })
    if (!res.ok) return false
    res = await res.json()
    let info = res?.data
    if (!info) return false
    const io = qr.image(info.url, {
        type: 'png',
        ec_level: 'H'
    })
    const f = `./data/image/mysQr-${Date.now()}.png`
    await promisify(stream.pipeline)(io, fs.createWriteStream(f));
    return {img: f, ticket: info.ticket}
}

async function scanQrCode(e) {
    return new Promise(async (resolve) => {
        let {img, ticket} = await fetchQrCode();
        let {message_id} = await e.reply(['请用米游社扫描：\n', segment.image(img)]);
        fs.unlink(img, () => {
        })
        const interval = setInterval(async () => {
            let res = await fetch("https://passport-api.miyoushe.com/account/ma-cn-passport/web/queryQRLoginStatus?ticket=" + ticket, {
                method: 'post',
                headers: getHeaders()
            })
            if (!res.ok) return false
            let status = await res.json()
            if (status.message !== 'OK') {
                await Bot.deleteMsg(message_id)
                clearInterval(interval)
                resolve(status.message)
                return false
            }
            if (!status.data) return false
            status = status?.data?.status
            if (status === 'Confirmed') {
                await Bot.deleteMsg(message_id);
                clearInterval(interval);
                let set_cookie = res.headers.get('set-cookie');
                set_cookie = set_cookie.split(", ")
                set_cookie = set_cookie.map(m => {
                    return m.split("; ")[0]
                })
                let ck = set_cookie.join("; ")
                resolve(ck);
            }
        }, 2000);
    })
}

function getHeaders() {
    return {
        "Accept": 'application/json, text/plain, */*',
        "Accept-Encoding": 'gzip, deflate, br',
        "Accept-Language": 'zh-CN,zh;q=0.9',
        "Connection": 'keep-alive',
        "Content-Length": 2,
        "Content-Type": 'application/json',
        "Host": 'passport-api.miyoushe.com',
        "Origin": 'https://user.miyoushe.com',
        "Referer": 'https://user.miyoushe.com/',
        "X-Rpc-App_id": 'bll8iq97cem8',
        "X-Rpc-Client_type": 4,
        "X-Rpc-Device_fp": '38d7eecd8e3d8',
        'X-Rpc-Device_id': '98cfc8c7-b24b-45ff-a0e2-19f9e09d5000',
        'X-Rpc-Device_model': 'Chrome%20114.0.0.0',
        'X-Rpc-Device_name': 'Chrome',
        'X-Rpc-Device_os': 'Windows%2010%2064-bit',
        'X-Rpc-Game_biz': 'bbs_cn'
    }
}

export default scanQrCode;