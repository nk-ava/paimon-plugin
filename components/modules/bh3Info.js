import Bh3Api from "./Bh3Api.js";
import MysInfo from "../../../genshin/model/mys/mysInfo.js";
import bh3Api from "./Bh3Api.js";
import Bh3User from "./Bh3User.js";

const apiFn = {
    "index": Bh3Api.getIndex,
    "characters": Bh3Api.getCharacters
}
const regions = ['hun01', 'hun02', 'android01', 'pc01', 'yyb01', 'bb01']

export async function fetchApi(e, option) {
    let {ck, uid, api, role} = option
    let index
    if (!ck) {
        if (!uid) {
            let user = new Bh3User(e);
            ck = await user.getCk();
            role = await user.getMainRole();
            if (!ck) {
                e.reply("未绑定ck");
                return {}
            }
            if (!role) {
                e.reply("米游社未绑定游戏角色");
                return {}
            }
            index = await bh3Api.getIndex(ck, role)
        } else {
            await MysInfo.initCache();
            let mysInfo = new MysInfo(e);
            let queryUid;
            if (/^[6-9]/.test(uid)) {
                queryUid = (Number(uid[0]) - 5) + uid.substr(1);
            } else queryUid = uid;
            mysInfo.uid = queryUid;
            ck = await mysInfo.getCookie();
            for (let region of regions) {
                role = {uid: uid, region: region};
                index = await bh3Api.getIndex(ck, role) || [];
                if (typeof index !== "string") break;
            }
            if (typeof index === "string") {
                e.reply("没有找到对应的角色信息");
                return {}
            }
        }
    }
    if (!role) {
        e.reply("获取游戏角色失败")
        return {}
    }
    if (!index) {
        e.reply("出错了")
        return {}
    }
    let data = {}
    if (!Array.isArray(api)) api = [api]
    for (let a of api) {
        if (a === "index") continue
        data[a] = await apiFn[a](ck, role)
    }
    data["index"] = index
    data["role"] = role
    return data
}