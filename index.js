import {Version} from "./components/index.js";
import YAML from "yaml";
import fs from "node:fs";

if (!global.segment) {
    global.segment = (await import("oicq")).segment
}

if (!global.core) {
    try {
        global.core = (await import("oicq")).core
    } catch (err) {
    }
}

if (Bot?.logger?.info) {
    Bot.logger.info("---------^_^---------");
    Bot.logger.info(`[PaiMon-Plugin]：v${Version.version}初始化~`)
} else {
    console.log(`[PaiMon-Plugin]：v${Version.version}初始化~`);
}
if (!fs.existsSync("./plugins/paimon-plugin/config/config/startCfg.yaml")) {
    fs.writeFileSync("./plugins/paimon-plugin/config/config/startCfg.yaml", fs.readFileSync("./plugins/paimon-plugin/config/default_config/startCfg.yaml", "utf-8"), "utf-8")
    Bot.logger.info("创建startCfg.yaml，可重启修改配置")
}
global.loadSandbox = YAML.parse(fs.readFileSync("./plugins/paimon-plugin/config/config/startCfg.yaml", "utf8")).sandbox;
let files = fs.readdirSync("./plugins/paimon-plugin/apps").filter(file => {
    if (!loadSandbox && file.includes("sandbox")) {
        return false;
    }
    return file.endsWith(".js")
});
let ret = [];

files.forEach(file => {
    ret.push(import(`./apps/${file}`));
})
ret = await Promise.allSettled(ret);

global.isPmPlaying = {};
try {
    fs.writeFileSync("./plugins/paimon-plugin/components/models/cmd.js", "");
    await import("./components/models/loading.js");
    logger.info("PaiMon-Plugin组件加载成功！！");
} catch (err) {
    logger.info("PaiMon-Plugin组件加载失败！！");
    logger.error(err);
}
global.commanding = false;
fs.watch("./plugins/paimon-plugin/components/models/cmd.js", async (event, filename) => {
    if (commanding) {
        return;
    }
    global.commanding = true;
    setTimeout(async () => {
        try {
            await import(`./components/models/cmd.js?version=${new Date().getTime()}`);
        } catch (err) {
            ev.reply(err.toString())
        }
        Bot.logger.mark(`更新${filename}成功`);
        global.commanding = false;
    }, 500);
})
let apps = {}
for (let i in files) {
    let name = files[i].replace(".js", "");
    if (ret[i].status !== "fulfilled") {
        logger.error(`载入插件错误：${logger.red(name)}`)
        logger.error(ret[i].reason)
        continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
export {apps}