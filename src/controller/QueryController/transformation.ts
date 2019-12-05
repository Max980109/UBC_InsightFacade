import {InsightError} from "../IInsightFacade";
import Decimal from "decimal.js";
export default class TransformQuery {
    public dataKind: string;
    public dataId: string;
    public filteredVal: any[];
    public tranformBody: any;
    public applyNum: string[] = ["MAX", "MIN", "AVG", "SUM"];
    public applyAll: string[] = ["COUNT"];
    public allCourseType: string[] = ["avg", "pass", "fail", "audit", "year",
        "dept", "id", "instructor", "title", "uuid"];

    public courseNumType: string[] = ["avg", "pass", "fail", "audit", "year"];
    public courseStrType: string[] = ["dept", "id", "instructor", "title", "uuid"];
    public allRoomType: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href",
        "lat", "lon", "seats"];

    public roomNumType: string[] = ["lat", "lon", "seats"];
    public roomStrType: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    constructor(datakind: string, dataSetId: string, filtered: any[], transform: any) {
        this.dataKind = datakind;
        this.dataId = dataSetId;
        this.filteredVal = filtered;
        this.tranformBody = transform;
    }


    public applyTransformation(): any[][] {
        let result = this.filteredVal;
        let transPart = this.tranformBody;
        for (let e of transPart["APPLY"]) {
            if (typeof e !== "object") {
                throw new InsightError("not object for apply obj");
            }
            let key: string = Object.keys(e)[0];
            let subobj = e[key];
            let subKey = Object.keys(subobj)[0];
            if (this.applyAll.includes(subKey)) {
                this.checkHelper(subobj[subKey], "all");
            } else if (this.applyNum.includes(subKey)) {
                this.checkHelper(subobj[subKey], "number");
            } else {
                throw new InsightError("invalid key of apply comparator");
            }
        }
        let grouped = this.groupValue(transPart["GROUP"], result);
        let ret = this.applyValue(transPart["APPLY"], grouped);
        return ret;
    }

    private checkHelper(val: any, type: string) {
        let fullfield = val;
        if (typeof fullfield === "string") {
            if (fullfield.includes("_")) {
                let strs = fullfield.split("_");
                if (strs.length > 2) {
                    throw new InsightError("invalid strs");
                }
                let dname = strs[0];
                let field = strs[1];
                if (dname !== this.dataId) {
                    throw new InsightError("invalid name of apply value");
                }
                if (this.dataKind === "courses") {
                    if (type === "all" && !this.allCourseType.includes(field)) {
                        throw new InsightError("incompatible type course all");
                    }
                    if (type === "number" && !this.courseNumType.includes(field)) {
                        throw new InsightError("incompatible type course num");
                    }
                }
                if (this.dataKind === "rooms") {
                    if (type === "all" && !this.allRoomType.includes(field)) {
                        throw new InsightError("incompatible type course all");
                    }
                    if (type === "number" && !this.roomNumType.includes(field)) {
                        throw new InsightError("incompatible type course num");
                    }
                }

            } else {
                throw new InsightError("invalid format of apply value");
            }
        } else {
            throw new InsightError("Invalid type of apply value ");
        }
    }

    public groupValue(group: any, result: any[]): any[][] {
        let ret = [result];
        for (let key of group) {
            let field: string = key.split("_")[1];
            let nextAry = ret;
            ret = [];
            for (let subGroup of nextAry) {
                // the code is learned from
                // https://medium.com/poka-techblog/simplify-your-javascript-use-map-reduce-and-filter-bd02c593cc2d
                let groupKey = subGroup.map(function (object) {
                    return object[field];
                });
                // the code is learn from
                // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
                let noDuplicate = [...new Set(groupKey)];
                for (let e of noDuplicate) {
                    let newGroup = subGroup.filter(function (o) {
                        return o[field] === e;
                    });
                    ret.push(newGroup);
                }
            }
        }
        return ret;
    }

    public applyValue(transform: any[], grouped: any[]): any[] {
        let ret: any[] = [];
        for (let group of grouped) {
            let representObject: any = group[0];
            if (transform.length === 0) {
                ret.push(representObject);
            }
            if (transform.length !== 0) {
                for (let applyRuleObject of transform) {
                    let applyRuleKey: string = Object.keys(applyRuleObject)[0];
                    let applySubObject = applyRuleObject[applyRuleKey];
                    let applyType: string = Object.keys(applySubObject)[0];
                    let applyField: string = applySubObject[applyType];
                    let realField: string = applyField.split("_")[1];
                    representObject[applyRuleKey] = this.applyValueCalculations(realField, group, applyType);
                }
                ret.push(representObject);
            }
        }
        return ret;
    }

    public applyValueCalculations(realField: string, group: any[], applyType: string): number {
        let ret: number;
        let ary = group.map(function (object) {
            return object[realField];
        });
        if (applyType === "MAX") {
            let cur = Number.MIN_VALUE;
            for (let val of ary) {
                if (val >= cur) {
                    cur = val;
                }
            }
            ret = cur;
        } else if (applyType === "MIN") {
            let cur = Number.MAX_VALUE;
            for (let val of ary) {
                if (val <= cur) {
                    cur = val;
                }
            }
            ret = cur;
        } else if (applyType === "AVG") {
            let decimalAry = ary.map(function (object) {
                return new Decimal(object);
            });
            let total = new Decimal(0);
            for (let val of decimalAry) {
                total = total.add(val);
            }
            let avg = total.toNumber() / decimalAry.length;
            ret = Number(avg.toFixed(2));
        } else if (applyType === "SUM") {
            let  decimalAry = ary.map(function (object) {
                return new Decimal(object);
            });
            let total = new Decimal (0);
            for (const val of decimalAry) {
                total = total.add(val);
            }
            ret = Number(total.toFixed(2));
        } else if (applyType === "COUNT") {
            let newAry = ary.filter(function (val, index, arry) {
                return arry.indexOf(val) === index;
            });
            ret = newAry.length;
        }
        return ret;
     }
}
