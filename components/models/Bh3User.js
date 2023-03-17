import YAML from "yaml";
import fs from "node:fs";

export default class Bh3User {
    constructor(e) {
        this.e = e;
        this.qq = e.user_id;
        this.actId = [];
        this.ckPath = "./data/bh3Ck";

        if (!fs.existsSync(this.ckPath)) {
            fs.mkdirSync(this.ckPath);
        }
    }

    async getMainRole() {
        let key1 = `PaiMon:bh3UID:${this.qq}`;
        let key2 = `PaiMon:bh3Region:${this.qq}`;
        let uid = await redis.get(key1);
        let region = await redis.get(key2);
        if (!uid || !region) {
            this._loadUser();
            for (let role of this.actId) {
                if (role["is_chosen"]) {
                    uid = role['game_uid'];
                    region = role['region'];
                    break;
                }
            }
            if(uid) await redis.set(key1, uid);
            if(region) await redis.set(key2, region);
        }
        return {uid, region};
    }

    get ck() {
        return this._ck;
    }

    set ck(ck) {
        this._ck = ck;
    }

    set Roles(roles) {
        this.actId = roles;
    }

    get Roles() {
        return this.actId;
    }

    async bingUser(ck, actId) {
        await this._deleteCache();
        if (ck) this.ck = ck;
        if (actId) this.actId = actId;
        if (!this.ck || !this.actId) return false;
        let yaml = {
            qq: this.qq,
            ck: this.ck,
            roles: this.actId,
            autoSign: true
        }
        fs.writeFileSync(`${this.ckPath}/${this.qq}.yaml`, YAML.stringify(yaml));
        return true;
    }

    _loadUser() {
        if (!fs.existsSync(`./data/bh3Ck/${this.qq}.yaml`)) {
            return null;
        }
        let userInfo = YAML.parse(fs.readFileSync(`./data/bh3Ck/${this.qq}.yaml`, "utf8"));
        this.ck = userInfo.ck;
        this.actId = userInfo.roles;
    }

    async _deleteCache(){
        await redis.del(`PaiMon:bh3UID:${this.qq}`);
        await redis.del(`PaiMon:bh3Region:${this.qq}`);
        await redis.del(`PaiMon:bh3Ck:${this.qq}`);
    }

    static getAllUserInfo() {
        if (!fs.existsSync("./data/bh3Ck")) {
            fs.mkdirSync("./data/bh3Ck");
        }
        let infoArr = fs.readdirSync("./data/bh3Ck");
        let ans = [];
        for (let a of infoArr) {
            let userInfo = YAML.parse(fs.readFileSync(`./data/bh3Ck/${a}`, "utf8"));
            userInfo.roles = userInfo.roles.filter(a => {
                return a["is_chosen"]
            })[0];
            ans.push(userInfo);
        }
        return ans;
    }

    async getCk() {
        let key = `PaiMon:bh3Ck:${this.qq}`;
        let ck = await redis.get(key);
        if (!ck) {
            if (!this.ck) {
                this._loadUser();
            }
            ck = this.ck;
            if(ck) await redis.set(key, ck);
        }
        return ck;
    }

    async getUid() {
        let key = `PaiMon:bh3UID:${this.qq}`;
        let uid = await redis.get(key);
        if (!uid) {
            let role = await this.getMainRole();
            uid = role.uid;
        }
        return uid;
    }
}