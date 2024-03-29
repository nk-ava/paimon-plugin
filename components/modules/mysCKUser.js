import fs from "node:fs";
import YAML from "yaml";

let ckPath = "./data/ltUidCk"
export default class MysCKUser {
    constructor(e) {
        this.e = e;
        this.uid = e.user_id;
        this.gmUid = [];
    }

    get mysCk() {
        return this._mysCk;
    }

    set mysCk(ck) {
        this._mysCk = ck;
    }

    set ck_bak(ck) {
        this._ck_bak = ck
    }

    get ck_bak() {
        return this._ck_bak
    }

    get ltuid() {
        if (!this._ltuid) {
            if (this._mysCk) {
                let uid = this._mysCk.match(/stuid=\d+;/)[0];
                this._ltuid = uid.replace("stuid=", "").replace(";", "");
            } else return undefined;
        } else {
            return this._ltuid;
        }
    }

    set ltuid(uid) {
        this._ltuid = uid;
    }

    bindMysCkUser() {
        if (!this._mysCk) {
            return '未绑定米游社ck，绑定失败';
        }
        let data = {
            qq: this.uid,
            uid: this.gmUid,
            ltuid: this._ltuid,
            mysCK: this._mysCk,
            ck_bak: this._ck_bak,
            autoSign: true
        }
        let yaml = YAML.stringify(data);
        if (!fs.existsSync(ckPath)) {
            fs.mkdirSync(ckPath);
        }
        fs.writeFileSync(`${ckPath}/${this.uid}.yaml`, yaml, 'utf8');
        return true;
    }

    static getAllMysCK() {
        if (!fs.existsSync(`${ckPath}`)) fs.mkdirSync(`${ckPath}`);
        let files = fs.readdirSync(`${ckPath}`);
        let ret = [];
        files.forEach(file => {
            let yaml = fs.readFileSync(`${ckPath}/${file}`, "utf8");
            yaml = YAML.parse(yaml);
            ret.push(yaml);
        })
        return ret;
    }

    static getCkByUid(uid) {
        let path = `${ckPath}/${uid}.yaml`;
        if (!fs.existsSync(path)) return '未绑定米游社ck';
        let yaml = fs.readFileSync(path, "utf8");
        yaml = YAML.parse(yaml);
        return yaml;
    }

    creatUser() {
        let yaml = MysCKUser.getCkByUid(this.uid);
        this.mysCk = yaml.mysCK;
        this.gmUid = yaml.uid
        this.ck_bak = yaml.ck_bak
        return this;
    }
}