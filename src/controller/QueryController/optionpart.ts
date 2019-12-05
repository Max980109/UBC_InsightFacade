import {ResultTooLargeError} from "../IInsightFacade";

export default class ProcessOption {
    public dataSetID: string;
    public colStr: Set<string>;
    public strOrder: string;
    public objOrder: any;
    public allfiled: any[] = ["avg", "pass", "fail", "audit", "year",
    "dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name",
        "address", "type", "furniture", "href", "lat", "lon", "seats" ];

    constructor(dataType: string, colString: Set<string>, strordered: string, objorderd: object) {
        this.dataSetID = dataType;
        this.colStr = colString;
        this.strOrder = strordered;
        this.objOrder = objorderd;
    }

    public processOptionWithoutTrans(filteredVal: any[]): any[] {
        let ret: any[] = [];
        for (const eachObj of filteredVal) {
            let keys = Object.keys(eachObj);
            let item: any = {};
            for (const key of keys) {
                let fullKey = this.dataSetID + "_" + key;
                if (this.colStr.has(fullKey)) {
                    item[fullKey] = eachObj[key];
                }
            }
            ret.push(item);
        }
        if (this.strOrder !== "") {
           ret = this.sortWithStringOrder(ret, this.strOrder);
        } else if  (Object.keys(this.objOrder).length !== 0) {
            ret = this.sortWithObject(ret, this.objOrder);
        }
        if (ret.length > 5000) {
            throw new ResultTooLargeError("the result is too large for the final result");
        }
        return ret;
    }


    private sortWithStringOrder(ret: any[], order: string): any[] {
        // the code is learned from
        // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
        ret.sort(function (e1: any, e2: any) {
            let data1 = e1[order];
            let data2 = e2[order];
            if (data1 > data2) {
                return 1;
            } else if (data1 < data2) {
                return -1;
            }
            return 0;
        });
        return ret;
    }

    public processOptionWithTrans(transformed: any[]): any {
        let ret: any[] = [];
        for (const eachObj of transformed) {
            let keys = Object.keys(eachObj);
            let item: any = {};
            for (const key of keys) {
                if (this.allfiled.includes(key)) {
                    let fullKey = this.dataSetID + "_" + key;
                    if (this.colStr.has(fullKey)) {
                        item[fullKey] = eachObj[key];
                    }
                } else {
                    if (this.colStr.has(key)) {
                        item[key] = eachObj[key];
                    }
                }
            }
            ret.push(item);
        }
        if (this.strOrder !== "") {
            ret = this.sortWithStringOrder(ret, this.strOrder);
        } else if  (Object.keys(this.objOrder).length !== 0) {
            ret = this.sortWithObject(ret, this.objOrder);
        }
        if (ret.length > 5000) {
            throw new ResultTooLargeError("the result is too large for the final result");
        }
        return ret;
    }

    public sortWithObject(ret: any[], objOrder: any): any[] {
        let keys: any[] = objOrder["keys"];
        let dir = objOrder["dir"];
        // code is learned from https://www.cnblogs.com/Answer1215/p/9470725.html
        let array = ret.slice();
        if (dir === "DOWN") {
            for (let i = 1; i < array.length; i++) {
                let current = array[i];
                let j = i - 1;
                while (j >= 0 && this.compare(array[j], current, 0, keys) < 0) {
                    array[j + 1] = array[j];
                    j--;
                }
                array[j + 1] = current;
            }
            return array;
    }
        if (dir === "UP") {
            for (let i = 1; i < array.length; i++) {
                let current = array[i];
                let j = i - 1;
                while (j >= 0 && this.compare(array[j], current, 0, keys) > 0) {
                    array[j + 1] = array[j];
                    j--;
                }
                array[j + 1] = current;
            }
            return array;
        }
    }

    private compare(num: any, cur: any, level: number, keys: any[]): number {
        while (level < keys.length) {
            let levelKey = keys[level];
            if (num[levelKey] > cur[levelKey]) {
                return 1;
            }
            if (num[levelKey] < cur[levelKey]) {
                return -1;
            }
            level ++;
        }
        return 0;
    }
}
