import Plugin from "../../../lib/plugins/plugin.js";
import {Sign} from "../components/models/MysSign.js";
import mysCKUser from "../components/models/mysCKUser.js";
import GachaLog from "../../genshin/model/gachaLog.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import fs from "node:fs";

let _path = process.cwd();
let notUpWeapon = ["阿莫斯之弓", "天空之翼", "天空之卷", "天空之脊", "天空之傲", "天空之刃", "四风原典", "和璞鸢", "狼的末路", "风鹰剑"];

export class pmGachaLog extends Plugin {
    constructor(e) {
        super({
            name: 'Pm祈愿分析',
            dsc: '实现祈愿总览',
            event: 'message',
            priority: 400,
            rule: [
                {
                    reg: '#获取断网链接\d*',
                    fnc: 'getLogUrl'
                },
                {
                    reg: '#*(更新)?祈愿分析\d*',
                    fnc: 'gachaAnalysis'
                }
            ]
        });
    }

    async getLogUrl(e) {
        if (!e.isPrivate) return true;
        let index = e.msg.match(/\d+/)?.[0];
        let info = await getAuthKey(e.user_id, index);
        if (info) {
            e.reply(info);
        } else {
            e.reply("请检查\n--米游社cookie是否绑定\n--是否绑定了uid");
        }
    }

    async gachaAnalysis(e) {
        if (!e.isPrivate) return true
        let flag = true;
        if (e.msg.includes("更新")) {
            let index = e.msg.match(/\d+/)?.[0];
            let info = await getAuthKey(e.user_id, index);
            info = info?.split("\n")[1];
            if (!info) {
                e.reply("获取断网链接失败");
                return true
            }
            e.msg = info;
            let data = await new GachaLog(e).logUrl()
            if (!data) flag = false;
        }
        if (!flag) return;
        let uid = await new GachaLog(e).getUid();
        if (!uid) return true
        let path = `./data/gachaJson/${e.user_id}/${uid}`;
        // console.log(path);
        let aways = JSON.parse(fs.readFileSync(`${path}/200.json`, "utf8"));
        let roleUp = JSON.parse(fs.readFileSync(`${path}/301.json`, "utf8"));
        let weaponUp = JSON.parse(fs.readFileSync(`${path}/302.json`, "utf8"));

        aways = analyse(aways);
        roleUp = analyse(roleUp);
        weaponUp = analyse(weaponUp);

        let all = aways.allNum + roleUp.allNum + weaponUp.allNum;
        let cnt = aways.fiveNum + roleUp.fiveNum + weaponUp.fiveNum;
        let arg = 0;
        let role = roleUp.fiveArr;
        let max = 0;
        let ans;
        let count = {};
        for (let i in role) {
            arg = arg * 1 + role[i].num;
            count[role[i].name] = count[role[i].name] * 1 + 1 || 1;
            if (count[role[i].name] * 1 >= max * 1) {
                max = count[role[i].name];
                ans = role[i].name;
            }
        }
        roleUp.maxFive = ans;
        max = 0;
        count = {};
        let weapon = weaponUp.fiveArr;
        for (let i in weapon) {
            arg = arg * 1 + weapon[i].num;
            count[weapon[i].name] = count[weapon[i].name] * 1 + 1 || 1;
            if (count[weapon[i].name] * 1 >= max * 1) {
                max = count[weapon[i].name];
                ans = weapon[i].name
            }
        }
        weaponUp.maxFive = ans;
        max = 0;
        count = {};
        let aw = aways.fiveArr;
        for (let i in aw) {
            arg = arg * 1 + aw[i].num;
            count[aw[i].name] = count[aw[i].name] * 1 + 1 || 1;
            if (count[aw[i].name] * 1 >= max * 1) {
                max = count[aw[i].name];
                ans = aw[i].name;
            }
        }
        aways.maxFive = ans;
        arg = Math.round((arg / cnt) * 100) / 100;
        let param = {
            saveId: e.user_id,
            uid: uid,
            tplFile: './plugins/paimon-plugin/resources/html/gachaAnalyse/gachaAnalyse.html',
            pluResPath: `${_path}/plugins/genshin/resources/img`,
            selfPath: `${_path}/plugins/paimon-plugin/resources/html/gachaAnalyse`,
            s_arg: arg,
            s_sum: all,
            cnt: cnt,
            level: o_level(arg),
            text: text_level(arg),
            history: [{
                name: '角色UP池',
                noNum: roleUp.noFiveNum,
                arg5: roleUp.fiveAvg,
                sum: roleUp.allNum,
                ret: `${roleUp.fiveNum - roleUp.wai}/${roleUp.fiveNum}`,
                level: o_level(roleUp.fiveAvg),
                text: text_level(roleUp.fiveAvg),
                label: [{
                    key: '四星最多',
                    value: `${roleUp.maxFour.name}*${roleUp.maxFour.num}`,
                }, {
                    key: '四星平均',
                    value: roleUp.fourAvg,
                }, {
                    key: '小保底不歪率',
                    value: roleUp.noWaiRate + "%",
                }, {
                    key: "UP花费原石",
                    value: roleUp.upYs,
                }],
                maxFive: roleUp.maxFive,
                addr: roleUp.fiveArr,
                timeLast: `${roleUp.firstTime}~${roleUp.lastTime}`,
            }, {
                name: '武器UP池',
                noNum: weaponUp.noFiveNum,
                arg5: weaponUp.fiveAvg,
                sum: weaponUp.allNum,
                ret: `${weaponUp.fiveNum - weaponUp.wai}/${weaponUp.fiveNum}`,
                level: o_level(weaponUp.fiveAvg),
                text: text_level(weaponUp.fiveAvg),
                label: [{
                    key: "四星最多",
                    value: `${weaponUp.maxFour.name}*${weaponUp.maxFour.num}`,
                }, {
                    key: "四星物品",
                    value: weaponUp.weaponFourNum,
                }, {
                    key: "四星平均",
                    value: weaponUp.fourAvg,
                }, {
                    key: "UP花费原石",
                    value: weaponUp.upYs,
                }],
                addr: weaponUp.fiveArr,
                maxFive: weaponUp.maxFive,
                timeLast: `${weaponUp.firstTime}~${weaponUp.lastTime}`,
            }, {
                name: '常驻池',
                noNum: aways.noFiveNum,
                arg5: aways.fiveAvg,
                sum: aways.allNum,
                ret: `0/${aways.fiveNum}`,
                level: o_level(aways.fiveAvg),
                text: text_level(aways.fiveAvg),
                label: [],
                addr: aways.fiveArr,
                maxFive: aways.maxFive,
                timeLast: `${aways.firstTime}~${aways.lastTime}`,
            }]
        }
        let img = await puppeteer.screenshot("gachaAnalyse", param);
        if (!img) {
            return true;
        }
        e.reply(img);
        return true;
    }
}

async function getAuthKey(qq, index) {
    let url = "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
    let game_uid, region, cookie;
    let info = mysCKUser.getCkByUid(qq);
    let game_info = typeof index !== "undefined" ? info['uid'][index - 1] : info['uid'].filter(a => a['is_chosen'])[0];
    try {
        game_uid = game_info['game_uid'];
        region = game_info.region;
        cookie = info.mysCK;
    } catch (err) {
        return false;
    }
    let data = {
        'auth_appid': 'webview_gacha',
        'game_biz': "hk4e_cn",
        'game_uid': game_uid,
        'region': region
    }
    let headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api-takumi.mihoyo.com',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://webstatic.mihoyo.com',
        'x-rpc-app_version': '2.34.1',
        'x-rpc-client_type': 2,
        'x-rpc-device_id': 'CBEC8312-AA77-489E-AE8A-8D498DE24E90',
        'x-requested-with': 'com.mihoyo.hyperion',
        'DS': Sign.getDsSign(),
        'Cookie': cookie,
    }
    let response = await fetch(url, {method: "post", headers: headers, body: JSON.stringify(data)});
    if (!response.ok) {
        return false;
    }
    response = await response.json();
    if (response.message.includes("登录失效")) {
        return "米游社cookie失效，请重新绑定";
    }
    let authKey = response?.data?.authkey;
    if (!authKey) return false;
    let log_url = `${game_uid}:\nhttps://webstatic.mihoyo.com/hk4e/event/e20190909gacha-v2/index.html?win_mode=fullscreen&authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=200&timestamp=${(new Date()).getTime()}&lang=zh-cn&device_type=mobile&plat_type=android&region=cn_qd01&authkey=${encodeURIComponent(authKey)}&game_biz=hk4e_cn#/log`;
    return log_url;
}

function analyse(all) {
    let fiveArr = [];
    let fourArr = [];
    let fiveNum = 0;
    let fourNum = 0;
    let fiveLogNum = 0;
    let fourLogNum = 0;
    let noFiveNum = 0;
    let noFourNum = 0;
    let wai = 0; //歪
    let weaponNum = 0;
    let weaponFourNum = 0;
    let allNum = all.length;
    let bigNum = 0;//大保底次数

    for (let val of all) {
        if (val.rank_type == 4) {
            fourNum++;
            if (noFourNum == 0) {
                noFourNum = fourLogNum;
            }
            fourLogNum = 0;
            if (fourArr[val.name]) {
                fourArr[val.name]++;
            } else {
                fourArr[val.name] = 1;
            }
            if (val.item_type == "武器") {
                weaponFourNum++;
            }
        }
        fourLogNum++;

        if (val.rank_type == 5) {
            fiveNum++;
            if (fiveArr.length > 0) {
                fiveArr[fiveArr.length - 1].num = fiveLogNum;
            } else {
                noFiveNum = fiveLogNum;
            }
            fiveLogNum = 0;
            fiveArr.push({
                name: val.name,
                abbrName: val.name,
                item_type: val.item_type,
                num: 0,
            });

            //歪了多少个
            if (val.item_type == "角色") {
                if (["莫娜", "七七", "迪卢克", "琴", "提纳里"].includes(val.name)) {
                    wai++;
                }
                //刻晴up过一次
                if (val.name == "刻晴") {
                    let start = new Date("2021-02-17 18:00:00").getTime();
                    let end = new Date("2021-03-02 15:59:59").getTime();
                    let logTime = new Date(val.time).getTime();

                    if (logTime < start || logTime > end) {
                        wai++;
                    }
                }
            } else {
                if (notUpWeapon.includes(val.name)) wai++;
                weaponNum++;
            }
        }
        fiveLogNum++;
    }
    if (fiveArr.length > 0) {
        fiveArr[fiveArr.length - 1].num = fiveLogNum;

        //删除未知五星
        for (let i in fiveArr) {
            if (fiveArr[i].name == "未知") {
                allNum = allNum - fiveArr[i].num;
                fiveArr.splice(i, 1);
                fiveNum--;
            } else {
                //上一个五星是不是常驻
                let lastKey = Number(i) + 1;
                if (fiveArr[lastKey] && ["莫娜", "七七", "迪卢克", "琴", "刻晴", "提纳里"].includes(fiveArr[lastKey].name)) {
                    fiveArr[i].minimum = true;
                    bigNum++;
                } else {
                    fiveArr[i].minimum = false;
                }
                if (!["莫娜", "七七", "迪卢克", "琴", "刻晴", "提纳里"].includes(fiveArr[i].name) && !notUpWeapon.includes(fiveArr[i].name)) {
                    fiveArr[i].isUP = true;
                }
            }
        }
    }
    //没有五星
    else {
        noFiveNum = allNum;
    }

    //四星最多
    let four = [];
    for (let i in fourArr) {
        four.push({
            name: i,
            num: fourArr[i],
        });
    }
    four = four.sort(function (a, b) {
        return b.num - a.num;
    });

    if (four.length <= 0) {
        four.push({name: "无", num: 0});
    }

    let fiveAvg = 0;
    let fourAvg = 0;
    if (fiveNum > 0) {
        fiveAvg = ((allNum - noFiveNum) / fiveNum).toFixed(2);
    }
    if (fourNum > 0) {
        fourAvg = ((allNum - noFourNum) / fourNum).toFixed(2);
    }
    //有效抽卡
    let isvalidNum = 0;

    if (fiveNum > 0 && fiveNum > wai) {
        if (fiveArr.length > 0 && ["莫娜", "七七", "迪卢克", "琴", "刻晴", "提纳里"].includes(fiveArr[0].name)) {
            isvalidNum = (allNum - noFiveNum - fiveArr[0].num) / (fiveNum - wai);
        } else {
            isvalidNum = (allNum - noFiveNum) / (fiveNum - wai);
        }
        isvalidNum = isvalidNum.toFixed(2);
    }

    let upYs = isvalidNum * 160;
    if (upYs >= 10000) {
        upYs = (upYs / 10000).toFixed(2) + "w";
    } else {
        upYs = upYs.toFixed(0);
    }

    //小保底不歪概率
    let noWaiRate = 0;
    if (fiveNum > 0) {
        noWaiRate = (fiveNum - bigNum - wai) / (fiveNum - bigNum);
        noWaiRate = (noWaiRate * 100).toFixed(1);
    }

    let firstTime = all[all.length - 1].time.substring(0, 16),
        lastTime = all[0].time.substring(0, 16);

    let fiveColor = "";
    switch (true) {
        case fiveAvg <= 40:
            fiveColor = "red";
            break;
        case fiveAvg <= 50:
            fiveColor = "orange";
            break;
        case fiveAvg <= 60:
            fiveColor = "purple";
            break;
        case fiveAvg <= 70:
            fiveColor = "blue";
            break;
    }

    return {
        allNum,
        noFiveNum,
        noFourNum,
        fiveNum,
        fourNum,
        fiveAvg,
        fourAvg,
        wai,
        isvalidNum,
        maxFour: four[0],
        weaponNum,
        weaponFourNum,
        firstTime,
        lastTime,
        fiveArr,
        fiveColor,
        upYs,
        noWaiRate,
    };
}

function o_level(num) {
    if (num * 1 <= 20) {
        return 0;
    } else if (num * 1 <= 40) {
        return 1;
    } else if (num * 1 <= 62) {
        return 2;
    } else if (num * 1 <= 70) {
        return 3;
    } else {
        return 4;
    }
}

function text_level(num) {
    if (num * 1 <= 20) {
        return "欧";
    } else if (num * 1 <= 40) {
        return "吉";
    } else if (num * 1 <= 62) {
        return "平";
    } else if (num * 1 <= 70) {
        return "愁";
    } else {
        return "非";
    }
}