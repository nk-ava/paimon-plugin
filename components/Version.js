import cfs from "../../../lib/config/config.js";

let currentVersion = '1.0.0';

let Version = {
    get version(){
        return currentVersion;
    },
    get masterQQ(){
        return cfs.masterQQ;
    }
}
export default Version;