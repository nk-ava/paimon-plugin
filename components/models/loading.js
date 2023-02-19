import util from "util";

//加载全局方法，可在聊天界面直接调用
async function loading() {
    function print(msg,e=ev) {
        if (e.isGroup) {
            if (e.msg.includes("BotConfig")) {
                e.reply("请不要在群里面配置配置信息");
                return;
            }
        }
        let s = util.format.apply(null, arguments);
        e.reply(s);
    }
    global.print = print;
}
await loading();