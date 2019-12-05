import {InsightError} from "../IInsightFacade";
import {IIdKindSet} from "../IInterface";

export default class ValidQuery {
    public dataSets: IIdKindSet;
    public dataSetId: string = "";
    public dataKind: string = "";
    public allCourseType: string[] = ["avg", "pass", "fail", "audit", "year",
        "dept", "id", "instructor", "title", "uuid"];

    public allRoomType: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href",
    "lat", "lon", "seats"];

    public columnStr: Set<string> = new Set<string>();
    public applyStr: Set<string> = new Set<string>();
    public StrOrder: string = "";
    public ObjOrder: any = {};
    public hasTrans: boolean;
    public direction: string;
    constructor(datasets: IIdKindSet) {
        this.dataSets = datasets;
    }

    public checkQuery(query: any) {
        // first check the overall structure of the query
        if (Object.keys(query).length > 3 && query.hasOwnProperty("TRANSFORMATIONS") ) {
            throw new InsightError("more than 3 keys in the query when transform");
        }
        if (Object.keys(query). length > 2 && !query.hasOwnProperty("TRANSFORMATIONS")) {
            throw new InsightError("more than 2 keys in the query when no transform");
        }
        if (!query.hasOwnProperty("WHERE")) {
            throw new InsightError("missing where in the query when no transform");
        }
        if (!query.hasOwnProperty("OPTIONS")) {
            throw new InsightError("missing option in the query");
        }
        if (!query["OPTIONS"].hasOwnProperty("COLUMNS")) {
            throw new InsightError("missing columns in the query");
        }
        // check sub properties
        if (!query.hasOwnProperty("TRANSFORMATIONS")) {
            this.checkWhere(query["WHERE"]);
            this.checkOptions(query["OPTIONS"]);
        } else {
            this.checkWhere(query["WHERE"]);
            this.hasTrans = true;
            this.checkTrans(query["TRANSFORMATIONS"]);
            this.checkTransGroup(query["TRANSFORMATIONS"]["GROUP"]);
            this.checkOptions(query["OPTIONS"]);
        }
    }

    public checkWhere(where: any) {
        if (typeof where !== "object") {
            throw new InsightError("where is not an object");
        }
        if (Object.keys(where).length > 1) {
            throw new InsightError("more than one key in the where");
        }
    }

    public checkOptions(options: any) {
        if (typeof options !== "object") {
            throw new InsightError("option is not an object");
        }
        if (Object.keys(options).length === 2 && !options.hasOwnProperty("ORDER")) {
            throw new InsightError("invalid key in the options");
        }
        if (Object.keys(options).length > 2) {
            throw new InsightError("more than two keys in the option");
        }
        this.checkColumns(options["COLUMNS"]);
        if (options.hasOwnProperty("ORDER")) {
            this.checkOrder(options["ORDER"]);
        }
    }

    public checkColumns(columns: any) {
        if (!Array.isArray(columns)) {
            throw new InsightError("column is not an array");
        }
        if (columns.length === 0) {
            throw new InsightError("column is empty");
        }
        for (const e of columns) {
            if (typeof e !== "string") {
                throw new InsightError("each alt must be a string");
            } else {
                this.checkKeyCol (e);
            }
        }
    }

    public checkKeyCol(alt: string) {
        if (this.hasTrans && !this.applyStr.has(alt)) {
            throw new InsightError("key in column is not apply or group");
        }
        if (alt.includes("_")) {
            let strs = alt.split("_");
            if (strs.length > 2) {
                throw new InsightError("invalid strs");
            }
            if (!strs[0].includes("_")) {
                if (this.dataSetId === "") {
                    this.dataSetId = strs[0];
                } else {
                    if (this.dataSetId !== strs[0]) {
                        throw new InsightError("id string is inconsistent");
                    }
                }
            } else {
                throw new InsightError("the dataset Id format is invalid");
            }
            if (this.allCourseType.includes(strs[1])) {
                if (this.dataKind === "") {
                    this.dataKind = "courses";
                } else {
                    if (this.dataKind !== "courses" ) {
                        throw new InsightError("query two different kinds at the same time");
                    }
                }
                this.columnStr.add(alt);
            } else if (this.allRoomType.includes(strs[1])) {
                if (this.dataKind === "") {
                    this.dataKind = "rooms";
                } else {
                    if (this.dataKind !== "rooms" ) {
                        throw new InsightError("query two different kinds at the same time");
                    }
                }
                this.columnStr.add(alt);
            } else {
                throw new InsightError("the kind is not known: courses or rooms");
            }
        } else {
            if (!this.applyStr.has(alt)) {
                throw new InsightError("col string no underscore but not in apply or group");
            } else {
                this.columnStr.add(alt);
            }
        }
    }

    public checkOrder(order: any) {
        if (typeof order === "string") {
            this.StrOrder = order;
            let flag = false;
            for (let field of this.columnStr) {
                if (field === order) {
                    flag = true;
                }
            }
            if (!flag) {
                throw new InsightError("order string is not in the column");
            }
        } else if (typeof order === "object") {
            this.ObjOrder = order;
            if (!order.hasOwnProperty("dir")) {
               throw new InsightError("no dir in object order");
           }
            if (!order.hasOwnProperty("keys")) {
               throw new InsightError("no keys in object order");
           }
            if (!Array.isArray(order["keys"])) {
               throw new InsightError("keys are not arry, object order");
           }
            if (order["keys"].length === 0) {
               throw new InsightError("empty arry in order object keys");
           }
            if (Object.keys(order).length !== 2) {
                throw new InsightError("obj order key length is not 2");
            }
            if (order["dir"] === "UP") {
               this.direction = "UP";
           } else if (order["dir"] === "DOWN") {
               this.direction = "DOWN";
           } else {
               throw new InsightError("dir should be either up or down");
           }
            for (let key of order["keys"]) {
               if (!this.columnStr.has(key) || typeof key !== "string") {
                   throw new InsightError("order key must be in the column");
               }
           }
        } else {
            throw new InsightError("order is not object or string");
        }
    }

    public checkTrans(trans: any) {
        if (!trans.hasOwnProperty("GROUP")) {
            throw new InsightError("missing group in the transformation");
        }
        if (!trans.hasOwnProperty("APPLY")) {
            throw new InsightError("missing apply in the transformation");
        }
        if (typeof trans !== "object") {
            throw new InsightError("trans is not an obj");
        }
        if (Object.keys(trans).length !== 2) {
            throw new InsightError("trans has more than two obj");
        }
        if (!Array.isArray(trans["GROUP"])) {
            throw new InsightError("group is not an array");
        }
        if (!Array.isArray(trans["APPLY"])) {
            throw new InsightError("Apply is not an array ");
        }
        if (trans["GROUP"].length === 0) {
            throw new InsightError("empty array in GROUP");
        }
        for ( let applyRule of trans["APPLY"]) {
            let key = Object.keys(applyRule)[0];
            if (typeof key === "string" && key !== "") {
                let str: string = key;
                if (!str.includes("_")) {
                    if (!this.applyStr.has(str)) {
                        this.applyStr.add(str);
                    } else {
                        throw new InsightError("apply key is not unique");
                    }
                } else {
                    throw new InsightError("invalid format for the apply key");
                }
            } else {
                throw new InsightError("apply key is not string or apply key is empty string");
            }
        }

    }

    public checkTransGroup(group: any) {
        for (let alt of group) {
            if (alt.includes("_")) {
                let strs = alt.split("_");
                if (strs.length > 2) {
                    throw new InsightError("invalid format of strs");
                }
                if (!strs[0].includes("_")) {
                    if (this.dataSetId === "") {
                        this.dataSetId = strs[0];
                    } else if (this.dataSetId !== strs[0]) {
                            throw new InsightError("id string is inconsistent");
                        }
                } else {
                    throw new InsightError("the dataset Id format is invalid");
                }
                if (this.allCourseType.includes(strs[1])) {
                    if (this.dataKind === "") {
                        this.dataKind = "courses";
                    } else if (this.dataKind !== "courses" ) {
                            throw new InsightError("query two different kinds at the same time 111");
                    }
                    if (!this.applyStr.has(alt)) {
                        this.applyStr.add(alt);
                    } else {
                        throw new InsightError("duplicate key in group");
                    }
                } else if (this.allRoomType.includes(strs[1])) {
                    if (this.dataKind === "") {
                        this.dataKind = "rooms";
                    } else if (this.dataKind !== "rooms" ) {
                            throw new InsightError("query two different kinds at the same time 111");
                        }
                    if (!this.applyStr.has(alt)) {
                        this.applyStr.add(alt);
                    } else {
                        throw new InsightError("duplicate key in group");
                    }
                } else {
                    throw new InsightError("the kind is not known: courses or rooms");
                }
            } else {
                if (!this.applyStr.has(alt)) {
                    throw new InsightError("invalid format for group key");
                } else {
                    this.applyStr.add(alt);
                }
            }
        }
    }
}

