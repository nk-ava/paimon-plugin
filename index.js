import {Version} from "./components/index.js";
import fs from "node:fs";

if (Bot?.logger?.info) {
    Bot.logger.info("---------^_^---------");
    Bot.logger.info(`[PaiMon-Plugin]：v${Version.version}初始化~`)
} else {
    console.log(`[PaiMon-Plugin]：v${Version.version}初始化~`);
}

let files = fs.readdirSync("./plugins/paimon-plugin/apps").filter(file => file.endsWith(".js"));
let ret = [];

// 重写添加好友
await import("./components/models/FriendSSO.js");

files.forEach(file => {
    ret.push(import(`./apps/${file}`));
})
ret = await Promise.allSettled(ret);

global.ISCMD = false;
global.isPmPlaying = {};
global.process.on("uncaughtException", (error) => {
    //*********************
});
try {
    fs.writeFileSync("./plugins/paimon-plugin/components/models/cmd.js", "");
    await import("./components/models/loading.js");
    logger.info("PaiMon-Plugin组件加载成功！！");
} catch (err) {
    logger.info("PaiMon-Plugin组件加载失败！！");
    logger.error(err);
}
let command = false;
fs.watch("./plugins/paimon-plugin/components/models/cmd.js", async (event, filename) => {
    if (command) {
        return;
    }
    command = true;
    setTimeout(async () => {
        try {
            await import(`./components/models/cmd.js?version=${new Date().getTime()}`);
        } catch (err) {
            ev.reply(err.toString())
        }
        Bot.logger.mark(`更新${filename}成功`);
        command = false;
    }, 500);
})
let apps = {}
for (let i in files) {
    let name = files[i].replace(".js", "");
    if (ret[i].status != "fulfilled") {
        logger.error(`载入插件错误：${logger.red(name)}`)
        logger.error(ret[i].reason)
        continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
export {apps}