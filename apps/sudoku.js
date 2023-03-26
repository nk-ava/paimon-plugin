import lodash from "lodash";
import fs from "node:fs";
import Plugin from "../../../lib/plugins/plugin.js";
import GmDao from "../components/models/GameDate.js";
import puppeteer from '../../../lib/puppeteer/puppeteer.js';

let isGiveUp = {};
let user_config = {};
let index = new Array(81);
for (let i = 0; i < 81; i++) index[i] = i;

export class sudoku extends Plugin {
    constructor(e) {
        super({
            name: '数独',
            dsc: 'Pm游戏4',
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: '#新数独(.*)',
                    fnc: 'startGame'
                },
                {
                    reg: "#(数独|答案)$",
                    fnc: 'getPic'
                },
                {
                    reg: '#我的答案 (.*)',
                    fnc: "answer"
                }
            ]
        });
    }

    async accept(e) {
        if (isGiveUp[e.user_id] && isGiveUp[e.user_id].flag) {
            isGiveUp[e.user_id].flag = false;
            if (e.msg === "是") {
                e.msg = isGiveUp[e.user_id].msg;
                let sum = await GmDao.getCnt(4, "sum", e.user_id)
                await GmDao.updateCnt(4, "sum", e.user_id, sum * 1 + 1)
                fs.unlinkSync(`./data/sudoku/${e.user_id}.json`);
                delete user_config[e.user_id];
            }
        }
    }

    async answer(e) {
        if (!fs.existsSync(`./data/sudoku/${e.user_id}.json`)) {
            e.reply("请先【#新数独】创建新数独");
            return true;
        }
        let msg = e.msg.replace("#我的答案 ", "");
        msg = msg.split(" ");
        let data = [];
        for (let i in msg) {
            let n = parseInt(msg[i]);
            if (!isNaN(n)) {
                data.push(n);
            } else {
                e.reply("答案为1~9内的数字");
                return true;
            }
        }
        let j = 0, t;
        if (user_config[e.user_id]) {
            t = JSON.parse(JSON.stringify(user_config[e.user_id]));
        } else {
            t = JSON.parse(fs.readFileSync(`./data/sudoku/${e.user_id}.json`));
            user_config[e.user_id] = JSON.parse(JSON.stringify(t));
        }
        let num = t.cnt;
        t = t.problem;
        for (let i in t) {
            if (t[i].value === 0) {
                if (j >= data.length) {
                    e.reply("答案输入错误");
                    return true;
                }
                t[i].value = data[j];
                j++;
            }
        }
        let {x, y, z} = check(t);
        if (x * 1 + y * 1 + z * 1 !== -3) {
            for (let i = 0; i < 9; i++) {
                if (x !== -1) {
                    t[9 * x + i].isCheck = true;
                }
                if (y !== -1) {
                    t[9 * i + y].isCheck = true;
                }
                if (z !== -1) {
                    let row = Math.floor(i / 3), col = i % 3;
                    t[9 * (3 * Math.floor(z / 3) + row) + 3 * (z % 3) + col].isCheck = true;
                }
            }
        }

        let img = await puppeteer.screenshot("sudoku", {
            saveId: e.user_id,
            data: t,
            tplFile: './plugins/paimon-plugin/resources/html/sudoku/sudoku.html'
        })

        if (!img) {
            return true;
        }
        msg = [];
        if (e.isGroup) {
            msg.push(segment.at(e.user_id));
            msg.push(" ");
        }
        if (x * 1 + y * 1 + z * 1 === -3) {
            msg.push("恭喜你，完成了本次数独");
            let sum = await GmDao.getCnt(4, "sum", e.user_id);
            let win = await GmDao.getCnt(4, "win", e.user_id);
            await GmDao.updateCnt(4, "sum", e.user_id, sum * 1 + 1);
            await GmDao.updateCnt(4, "win", e.user_id, win * 1 + 1);
            fs.unlinkSync(`./data/sudoku/${e.user_id}.json`);
            delete user_config[e.user_id];
        } else {
            num = num * 1 - 1;
            user_config[e.user_id].cnt = num;
            msg.push("答案错误，请查看标红的地方是否正确。" + (num * 1 > 0 ? `你还有${num}次机会` : ""));
            if (num === 0) {
                let sum = await GmDao.getCnt(4, "sum", e.user_id);
                await GmDao.updateCnt(4, "sum", e.user_id, sum * 1 + 1);
                fs.unlinkSync(`./data/sudoku/${e.user_id}.json`);
                delete user_config[e.user_id];
            } else fs.writeFileSync(`./data/sudoku/${e.user_id}.json`, JSON.stringify(user_config[e.user_id]));
        }
        msg.push(img);
        e.reply(msg);
        return true;
    }

    async getPic(e) {
        let flag = false;
        if (!fs.existsSync(`./data/sudoku/${e.user_id}.json`)) {
            e.reply("请先【#新数独】创建再查看");
            return true;
        }
        let t, num;
        if (user_config[e.user_id]) {
            t = JSON.parse(JSON.stringify(user_config[e.user_id]));
        } else {
            t = JSON.parse(fs.readFileSync(`./data/sudoku/${e.user_id}.json`));
            user_config[e.user_id] = JSON.parse(JSON.stringify(t));
        }
        if (e.msg.includes("数独")) {
            num = t.cnt;
            t = t.problem;
        } else {
            t = t.ans;
            let sum = await GmDao.getCnt(4, "sum", e.user_id);
            await GmDao.updateCnt(4, "sum", e.user_id, sum * 1 + 1);
            fs.unlinkSync(`./data/sudoku/${e.user_id}.json`);
            delete user_config[e.user_id];
            flag = true;
        }
        let img = await puppeteer.screenshot("sudoku", {
            saveId: e.user_id,
            data: t,
            tplFile: './plugins/paimon-plugin/resources/html/sudoku/sudoku.html'
        })
        if (!img) {
            return true;
        }
        let mss = [];
        if (e.isGroup) {
            mss.push(segment.at(e.user_id));
            mss.push(" ");
        }
        mss.push(flag ? "答案仅供参考" : `你还有${num}次机会`);
        mss.push(img);
        e.reply(mss);
        return true;
    }

    async startGame(e) {
        let msg = e.msg;
        if (!/#新数独\s(\d*)/.test(msg)) {
            e.reply("格式为【#新数独 <提示的空格数>】");
            return true;
        }
        let number = msg.split(" ")[1];
        if (!number) {
            e.reply("请检查输入是否正确");
            return true;
        }
        if (number * 1 < 0 || number * 1 > 81) {
            e.reply("不合法的提示数");
            return true;
        }

        if (fs.existsSync(`./data/sudoku/${e.user_id}.json`)) {
            e.reply("你上个数独还未完成，是否放弃开始新数独。【#数独】可查看当前数独");
            isGiveUp[e.user_id] = {
                flag: true,
                msg: e.msg,
            }
            return true;
        }
        //create new sudoku
        let ans = createAns();

        let title = JSON.parse(JSON.stringify(ans));
        let block = lodash.sampleSize(index, 81 - number * 1);
        for (let value of block) {
            let x = Math.floor(value / 9);
            let y = value % 9;
            title[x][y] = 0;
        }

        title = lodash.flatten(title);
        title = title.map((x) => {
            return {value: x, isCheck: false}
        });

        //渲染
        let img = await puppeteer.screenshot("sudoku", {
            saveId: e.user_id,
            data: title,
            tplFile: "./plugins/paimon-plugin/resources/html/sudoku/sudoku.html",
        })

        if (!img) {
            return true;
        }

        let mss = [];
        if (e.isGroup) {
            mss.push(segment.at(e.user_id));
            mss.push(" ");
        }
        mss.push(img);
        mss.push("发送【#我的答案 1 4 5 9 3】用来回答")
        e.reply(mss);

        ans = lodash.flatten(ans);
        ans = ans.map((x) => {
            return {value: x, isCheck: false}
        });

        user_config[e.user_id] = {
            ans: ans,
            problem: title,
            cnt: 3,
        }

        //数据保存到本地
        if (!fs.existsSync("./data/sudoku")) {
            fs.mkdirSync("./data/sudoku");
        }
        fs.writeFileSync(`./data/sudoku/${e.user_id}.json`, JSON.stringify(user_config[e.user_id]));
        // console.log("success in create new sudoku")
        return true;
    }
}

function createAns() {
    let num = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    num = disrupt(num);
    let seed = Array.from(new Array(3), () => new Array(3));
    let src = new Array(9);
    for (let i = 0; i < 9; i++) src[i] = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (let i = 0; i < 9; i++) seed[Math.floor(i / 3)][i % 3] = num[i];
    let temp;
    copyArr(src, 4, seed)
    temp = seed.exchange(false, 0, 1).exchange(false, 0, 2);
    copyArr(src, 1, temp)
    temp = seed.exchange(false, 0, 2).exchange(false, 0, 1);
    copyArr(src, 7, temp)
    temp = seed.exchange(true, 0, 1).exchange(true, 0, 2);
    let tp = temp.exchange(false, 0, 1).exchange(false, 0, 2);
    copyArr(src, 0, tp)
    tp = temp.exchange(false, 0, 2).exchange(false, 0, 1)
    copyArr(src, 6, tp)
    copyArr(src, 3, temp)
    temp = seed.exchange(true, 0, 2).exchange(true, 0, 1);
    tp = temp.exchange(false, 0, 1).exchange(false, 0, 2)
    copyArr(src, 2, tp)
    tp = temp.exchange(false, 0, 2).exchange(false, 0, 1)
    copyArr(src, 8, tp)
    copyArr(src, 5, temp)

    for (let i = 0; i < 30; i++) {
        let type = lodash.sample([true, false]);
        let num = lodash.sample([0, 1, 2]);
        let value;
        if (num == 0) {
            value = lodash.sampleSize([0, 1, 2], 2);
        } else if (num == 1) {
            value = lodash.sampleSize([3, 4, 5], 2);
        } else {
            value = lodash.sampleSize([6, 7, 8], 2);
        }
        src = src.exchange(type, value[0], value[1]);
    }
    return src;
}

Array.prototype.exchange = function (is_row, a, b) {
    let arr = JSON.parse(JSON.stringify(this));
    let len, temp;
    if (is_row) len = arr[0].length;
    else len = arr.length;
    for (let i = 0; i < len; i++) {
        if (is_row) {
            temp = arr[a][i];
            arr[a][i] = arr[b][i];
            arr[b][i] = temp;
        } else {
            temp = arr[i][a];
            arr[i][a] = arr[i][b];
            arr[i][b] = temp;
        }
    }
    return arr;
}
Object.defineProperty(Array.prototype, "exchange", {
    enumerable: false,
})

let copyArr = function (source, n, data) {
    let x = 3 * Math.floor(n / 3);
    let y = 3 * (n % 3);
    let row = data.length;
    let col = data[0].length;
    for (let i = 0; i < row; i++)
        for (let j = 0; j < col; j++)
            source[x + i][y + j] = data[i][j];
}

function disrupt(arr) {
    let len = arr.length, disruptIndex, temp;
    while (len) {
        disruptIndex = Math.floor(Math.random() * (len--));
        temp = arr[disruptIndex];
        arr[disruptIndex] = arr[len];
        arr[len] = temp;
    }
    return arr;
}

function check(arr) {
    for (let i = 0; i < 9; i++) {
        let pass1 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        let pass2 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let j = 0; j < 9; j++) {
            if (pass1.includes(arr[i * 9 + j].value)) {
                pass1[arr[i * 9 + j].value - 1] = -1;
            } else {
                return {x: i, y: -1, z: -1};
            }
            if (pass2.includes(arr[j * 9 + i].value)) {
                pass2[arr[j * 9 + i].value - 1] = -1;
            } else {
                return {x: -1, y: i, z: -1};
            }
        }
    }
    for (let i = 0; i < 9; i++) {
        let x = 3 * Math.floor(i / 3), y = 3 * (i % 3);
        let pass = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (pass.includes(arr[(x + row) * 9 + col + y].value)) {
                    pass[arr[(x + row) * 9 + col + y].value - 1] = -1;
                } else {
                    return {x: -1, y: -1, z: i};
                }
            }
        }
    }
    return {x: -1, y: -1, z: -1};
}