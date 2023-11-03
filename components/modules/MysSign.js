import fetch from "node-fetch";
import lodash from "lodash";
import md5 from "md5";
import uuid from "node-uuid";

class MysSign {

    constructor(cookie, forum_id, gids) {
        this.cookie = cookie;
        this.forum_id = forum_id;
        this.gids = gids;
    }

    //构建请求头
    static getHeaders(cookie) {
        return {
            "x-rpc-client_type": 2,
            "x-rpc-app_version": "2.34.1",
            "x-rpc-sys_version": "10",
            "x-rpc-channel": "miyousheluodi",
            "x-rpc-device_id": uuid.v1().replace(/-/g, "").toLowerCase(),
            "x-rpc-device_name": "Xiaomi Redmi Note 4",
            "x-rpc-device_fp": "38d7edaad494f",
            "Referer": "https://app.mihoyo.com",
            "Content-Type": "application/json",
            "Host": "bbs-api.mihoyo.com",
            "Connection": "Keep-Alive",
            "Accept-Encoding": "gzip",
            "User-Agent": "okhttp/4.8.0",
            "x-rpc-device_model": "Redmi Note 4",
            "is_Login": "true",
            "DS": Sign.getDsSign(),
            "cookie": cookie,
        }
    }
    //获取游戏讨论区帖子
    async getPosts() {
        let url = "https://bbs-api.mihoyo.com/post/api/getForumPostList";
        let query = `forum_id=${this.forum_id}&is_good=false&is_hot=false&page_size=20&sort_type=1`;
        let param = {
            headers: MysSign.getHeaders(this.cookie),
            method: "get",
        }
        let response = await(await fetch(url + "?" + query, param)).json();
        if (response.message === "OK") return response.data.list;
        else return undefined;
    }
    //浏览帖子
    async viewPosts(post_id) {
        let url = "https://bbs-api.mihoyo.com/post/api/getPostFull";
        let query = `post_id=${post_id}`;
        let param = {
            headers: MysSign.getHeaders(this.cookie),
            method: "get",
        }
        let res = await(await fetch(url + "?" + query, param)).json();
        if (res.message === "OK") return true;
        else return false;
    }
    //点赞帖子
    async upVote(post_id) {
        let url = "https://bbs-api.mihoyo.com/apihub/sapi/upvotePost";
        let data = {
            "post_id": post_id,
            "is_cancel": "false",
        }
        let param = {
            headers: MysSign.getHeaders(this.cookie),
            method: "post",
            body: JSON.stringify(data),
        }
        let res = await(await fetch(url, param)).json();
        if (res.message === "OK") return true;
        else return false;
    }
    //分享帖子
    async sharePost(post_id) {
        let url = "https://bbs-api.mihoyo.com/apihub/api/getShareConf";
        let query = `entity_id=${post_id}&entity_type=1`;
        let param = {
            method: "get",
            headers: MysSign.getHeaders(this.cookie),
        }
        let rs = await(await fetch(url + "?" + query, param)).json();
        if (rs.message === "OK") return true;
        else return false;
    }
    //讨论区签到
    async fourm_sign() {
        let url = `https://bbs-api.mihoyo.com/apihub/app/api/signIn`;
        let data = {
            gids: this.gids,
        }
        let param = {
            method: "post",
            body: JSON.stringify(data),
            headers: MysSign.getHeaders(this.cookie),
        }
        param.headers['DS'] = Sign.getCommunityDs("", JSON.stringify(data));
        let rs = await fetch(url, param);
        if (!rs.ok) {
            return "米游社接口错误";
        }
        rs = await rs.json();
        return rs.message;
    }
}

const Sign = {
    getCommunityDs(q = "", b = "") {
        let n = "t0qEgfub6cvueAPgR5m9aQWWVciEer7v";
        let t = Math.round(new Date().getTime() / 1000);
        let r = Math.floor(Math.random() * 100000 + 100000);
        let DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`);
        return `${t},${r},${DS}`;
    },
    getDsSign() {
        const n = "z8DRIUjNDT7IT5IZXvrUAxyupA1peND9";
        const t = Math.round(new Date().getTime() / 1000); // i
        const r = lodash.sampleSize("abcdefghijklmnopqrstuvwxyz", 6).join(""); // r
        const DS = md5(`salt=${n}&t=${t}&r=${r}`); //
        return `${t},${r},${DS}`;
    },
}
export { Sign };

export default MysSign;

async function createSign(cookie, forum_id, gids, is_share) {
    let mys = new MysSign(cookie, forum_id, gids);
    let mss = await mys.fourm_sign();
    if (mss.includes("登录失效")) {
        return mss + "，请重新绑定米游社cookie";
    }
    let posts = await mys.getPosts();
    let i = 0;
    let views = 0, votes = 0, shares = 0;
    try {
        while (i < 20 && (views < 10 || votes < 10)) {
            let id = posts[i].post.post_id;
            if (views < 10) {
                if (await mys.viewPosts(id)) {
                    views++;
                } else {
                    Bot.logger.error(`浏览${id}帖子失败`);
                }
            }
            if (votes < 10) {
                if (await mys.upVote(id)) {
                    votes++;
                } else {
                    Bot.logger.error(`点赞${id}帖子失败`);
                }
            }
            if (is_share && shares < 3) {
                await sleep(1000);
                if (await mys.sharePost(id)) {
                    shares++;
                } else {
                    Bot.logger.error(`分享${id}帖子失败`);
                }
            }
            await sleep(1000);
            i++;
        }
    } catch (err) {
        return "帖子获取失败，请手动过验证后再试。"
    }
    let game = "";
    if (forum_id == "1") game = "崩坏三";
    else if (forum_id == "26") game = "原神";
    return `今日${game}区：\n讨论区签到：${mss}\n点赞帖子成功：${votes}\n分享贴子成功：${shares}\n浏览帖子成功：${views}`;
}
export { createSign, MysSign};

function sleep(time) {
    return new Promise(reslove => setTimeout(reslove, time));
}