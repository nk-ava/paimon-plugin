import fs from "fs";

let ans = {};
let files = fs.readdirSync("./");
for (var i in files) {
    if (!['index.js', 'info.json', 'node_modules', 'package.json'].includes(files[i])) {
        files[i] = String(files[i]).replace(/[0-9]|(.jpg)/g, "");
        ans[`${files[i]}`] = ans[`${files[i]}`]+1||1;
    }
}
ans = JSON.stringify(ans, "", "\t");
fs.writeFileSync("./info.json",ans);
console.log("执行成功，请前往info.json查看");