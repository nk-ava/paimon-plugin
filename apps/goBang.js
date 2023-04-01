import Plugin from "../../../lib/plugins/plugin.js";
import GmDao from "../components/models/GameDate.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import {gmErrorMsg} from "../components/models/GameDate.js";
import {Cfg} from "../components/index.js";

const _path = process.cwd()
let initChess = [];
let chessBoard = {};
let GroupConf = {};
let start = {};
for (let i = 0; i <= 16; i++) {
    let temp = [];
    for (let j = 0; j <= 16; j++) {
        let v = {};
        v.status = 0;
        temp.push(v);
    }
    initChess.push(temp);
}

export class goBang extends Plugin {
    constructor(e) {
        super({
            name: '五子棋',
            dsc: 'Pm游戏3',
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: "(M_onlyPm_)?#五子棋",
                    fnc: 'goBang'
                },
                {
                    reg: '(M_onlyPm_)?#结束游戏',
                    fnc: 'gameOver'
                },
                {
                    reg: '(M_onlyPm_)?#*棋局',
                    fnc: 'situation'
                }
            ]
        });
    }

    async accept(e) {
        if (start[e.group_id]) {
            let n = GroupConf[e.group_id].index;
            if (e.user_id !== GroupConf[e.group_id].joinPerson[n]) {
                return false;
            }
            let data = chessBoard[e.group_id];
            let num = e.toString().split(",", 2), x, y;
            try {
                x = parseInt(num[0]);
                y = parseInt(num[1]);
            } catch (err) {
                e.reply("请按规则输入");
                return true;
            }
            if (isNaN(x) || isNaN(y) || x < 1 || x > 15 || y < 1 || y > 15 || data[x][y].status !== 0) {
                e.reply("你不能这样走");
                return true;
            }
            if (n === 1) {
                data[x][y].status = 1;
            } else {
                data[x][y].status = 2;
            }
            if (check(data, x, y)) {
                e.reply([segment.at(e.user_id), "恭喜你赢了"]);
                let sum_a = await GmDao.getCnt(3, "sum", GroupConf[e.group_id].joinPerson[0]);
                let sum_b = await GmDao.getCnt(3, "sum", GroupConf[e.group_id].joinPerson[1]);
                let win = await GmDao.getCnt(3, "win", e.user_id);
                await GmDao.updateCnt(3, "sum", GroupConf[e.group_id].joinPerson[0], sum_a * 1 + 1);
                await GmDao.updateCnt(3, "sum", GroupConf[e.group_id].joinPerson[1], sum_b * 1 + 1);
                await GmDao.updateCnt(3, "win", GroupConf[e.group_id].joinPerson[1], win * 1 + 1);
                this.gameOver(e, false);
                return true;
            }
            n = (n * 1 + 1) % 2;
            GroupConf[e.group_id].index = n;
            let img = await puppeteer.screenshot("gobang", {
                tplFile: "./plugins/paimon-plugin/resources/html/gobang/gobang.html",
                saveId: e.group_id,
                plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
                data: chessBoard[e.group_id],
            })
            if (img) e.reply([segment.at(GroupConf[e.group_id].joinPerson[n]), img]);
            else e.reply("出现未知错误，生成图片失败。请选择其他游戏");
            return true;
        }
    }

    async goBang(e) {
        if (Cfg.get("banGm")?.ban?.includes(e.group_id)) return true;
        if (!isPmPlaying[e.group_id]) {
            if (!e.isGroup) {
                e.reply("五子棋只能在群里玩");
                return true;
            }
            GroupConf[e.group_id] = {};
            GroupConf[e.group_id].joinPerson = [];
            GroupConf[e.group_id].joinPerson.push(e.user_id);
            for (let m of e.message) {
                if (m.type === "at" && !GroupConf[e.group_id].joinPerson.includes(m.qq)) {
                    GroupConf[e.group_id].joinPerson.push(m.qq);
                }
                if (GroupConf[e.group_id].joinPerson.length === 2) break;
            }
            if (GroupConf[e.group_id].joinPerson.length < 2) {
                e.reply("五子棋需要两个人才能开始，请at另外一个人");
                delete GroupConf[e.group_id];
                return true;
            }
            isPmPlaying[e.group_id] = 3;
            chessBoard[e.group_id] = JSON.parse(JSON.stringify(initChess));
            GroupConf[e.group_id].index = 0;
            let img = await puppeteer.screenshot("gobang", {
                tplFile: "./plugins/paimon-plugin/resources/html/gobang/gobang.html",
                saveId: e.group_id,
                plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
                data: chessBoard[e.group_id],
            })
            if (img) {
                e.reply([segment.at(GroupConf[e.group_id].joinPerson[0]), img]);
                start[e.group_id] = true;
            } else e.reply("出现未知错误，生成图片失败。请选择其他游戏");
        } else {
            e.reply(gmErrorMsg(e));
        }
        return true;
    }

    gameOver(e, flag = true) {
        if (isPmPlaying[e.group_id] === 3) {
            delete isPmPlaying[e.group_id];
            delete GroupConf[e.group_id];
            start[e.group_id] = false;
            if (flag) e.reply("五子棋已结束");
            return true;
        }
        return false;
    }

    async situation(e) {
        if (start[e.group_id]) {
            let img = await puppeteer("gobang", {
                tplFile: "./plugins/paimon-plugin/resources/html/gobang/gobang.html",
                saveId: e.group_id,
                plusResPath: `${_path}/plugins/paimon-plugin/resources/html`,
                data: chessBoard[e.group_id]
            })
            if (img) e.reply(img);
            else e.reply("出现未知错误，生成图片失败。请选择其他游戏");
            return true;
        }
    }
}

function check(data, x, y) {
    let num = 0;
    //横排
    num = 1;
    for (let i = y + 1; i <= 15; i++) if (data[x][i].status === data[x][y].status) num = num + 1; else break;
    for (let i = y - 1; i >= 1; i--) if (data[x][i].status === data[x][y].status) num = num + 1; else break;
    if (num >= 5) return true;
    //竖排
    num = 1;
    for (let i = x + 1; i <= 15; i++) if (data[i][y].status === data[x][y].status) num = num + 1; else break;
    for (let i = x - 1; i >= 1; i--) if (data[i][y].status === data[x][y].status) num = num + 1; else break;
    if (num >= 5) return true;
    //斜下方
    num = 1;
    for (let i = 1; x * 1 + i <= 15 && y * 1 + i <= 15; i++) if (data[x * 1 + i][y * 1 + i].status === data[x][y].status) num = num * 1 + 1; else break;
    for (let i = 1; x * 1 - i >= 1 && y * 1 - i >= 1; i++) if (data[x * 1 - i][y * 1 - i].status === data[x][y].status) num = num * 1 + 1; else break;
    if (num >= 5) return true;
    //斜上方
    num = 1;
    for (let i = 1; y * 1 + i <= 15 && x * 1 - i >= 1; i++) if (data[x * 1 - i][y * 1 + i].status === data[x][y].status) num = num * 1 + 1; else break;
    for (let i = 1; x * 1 + i <= 15 && y * 1 - i >= 1; i++) if (data[x * 1 + i][y * 1 - i].status === data[x][y].status) num = num * 1 + 1; else break;
    if (num >= 5) return true;
    return false;
}