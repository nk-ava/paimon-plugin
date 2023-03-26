
const FRD_BUF = core.pb.encode({
    1: 20,
    4: 1000,
    5: 2,
    6: {
        4: 1,
        7: 1,
        9: 1,
        10: 1,
        15: 1,
    },
    7: 0,
    8: 0,
    9: 0,
    10: 1,
    11: 2
});

Bot.on("internal.sso", async (cmd, payload, seq) => {
    if (cmd === "MessageSvc.PushNotify") {
        if (!Bot._sync_cookie)
            return;
        try {
            var nested = core.jce.decodeWrapper(payload.slice(4));
        } catch {
            var nested = core.jce.decodeWrapper(payload.slice(15));
        }
        switch (nested[5]) {
            case 187:
            case 191:
                return getFrdSysMsg();
        }
    }
})

async function getFrdSysMsg() {
    let payload = await Bot.sendUni("ProfileService.Pb.ReqSystemMsgNew.Friend",FRD_BUF);
    let rsp = core.pb.decode(payload)[9];
    if (!Array.isArray(rsp))
        rsp = [rsp];
    for (const proto of rsp) {
        try {
            const e = parseFrdSysMsg(proto);
            if (Bot._msgExists(e.user_id, 0, proto[3], e.time))
                continue;
            e.approve = (yes = true) => {
                return Bot.pickUser(e.user_id).setFriendReq(e.seq, yes);
            };
            if (e.sub_type === "single") {
                Bot.sl.set(e.user_id, {
                    user_id: e.user_id,
                    nickname: e.nickname,
                });
                Bot.logger.info(`${e.user_id}(${e.nickname}) 将你添加为单向好友 (seq: ${e.seq}, flag: ${e.flag})`);
                Bot.em("request.friend.single", e);
            }
            else {
                Bot.logger.info(`收到 ${e.user_id}(${e.nickname}) 的加好友请求 (seq: ${e.seq}, flag: ${e.flag})`);
                Bot.em("request.friend.add", e);
            }
        }
        catch (e) {
            Bot.logger.trace(e.message);
        }
    }
}

function parseFrdSysMsg(proto) {
    let single;
    if (proto[50][1] === 10 && String(proto[50][6]) === "")
        single = true;
    else if (proto[50][1] === 1)
        single = false;
    else
        throw new Error("unsupported friend request type: " + proto[50][1]);
    const time = proto[4];
    const user_id = proto[5];
    const nickname = String(proto[50][51]);
    const seq = proto[3];
    const flag = genFriendRequestFlag(user_id, proto[3], proto[50][1] === 10);
    const source = String(proto[50][5]);
    const comment = String(proto[50][4] ? proto[50][4] : "");
    const sex = proto[50][67] === 0 ? "male" : (proto[50][67] === 1 ? "female" : "unknown");
    const age = proto[50][68];
    return {
        post_type: "request",
        request_type: "friend",
        sub_type: single ? "single" : "add",
        user_id, nickname, source, comment, seq, sex, age, flag, time
    };
}

function genFriendRequestFlag(user_id, seq, single = false) {
    let flag = user_id.toString(16).padStart(8, "0") + seq.toString(16);
    if (single)
        flag = "~" + flag;
    return flag;
}