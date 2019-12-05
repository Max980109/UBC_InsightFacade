import {IAstTree} from "./parseQuery";
import {IInterface} from "../IInterface";
import {InsightError, ResultTooLargeError} from "../IInsightFacade";

export default class TraverseData {
    public dataSetKind: string;
    public dataSetId: string;
    constructor(dataId: string, dataKind: string ) {
        this.dataSetId = dataId;
        this.dataSetKind = dataKind;
    }

    public filterValue(conditionTree: IAstTree, dataset: IInterface): any[] {
        let result: any[] = [];
        if (conditionTree.key === "") {
            result = dataset[this.dataSetId];
            return result;
        } else {
            let actualData = dataset[this.dataSetId];
            result = this.generalFilter(conditionTree, actualData);
            return result;
        }
    }

    private generalFilter(conditionTree: IAstTree, dataset: any[]): any[] {
        let result: any[] = [];
        let comparator = conditionTree.key;
        switch (comparator) {
            case "AND":
            case "OR":
                result = this.logicalTraverse(comparator, conditionTree.node, dataset);
                break;
            case "GT":
            case "LT":
            case "EQ":
                result = this.mTraverse(comparator, conditionTree.val, dataset);
                break;
            case "IS":
                result = this.sTraverse(comparator, conditionTree.val, dataset);
                break;
            case "NOT":
                result = this.negTraverse(comparator, conditionTree.node, dataset);
        }
        return result;
    }

    private logicalTraverse(comparator: string, node: any[], dataset: any[]): any[] {
        let ret: any[] = [];
        for (let subNode of node) {
            if (comparator === "AND") {
                if (node.indexOf(subNode) === 0) {
                    ret = this.union(ret, this.generalFilter(subNode, dataset));
                } else {
                    ret = this.intersect(ret, this.generalFilter(subNode, dataset));
                }
            }
            if (comparator === "OR") {
                ret = this.union(ret, this.generalFilter(subNode, dataset));
            }
        }
        return ret;
    }

    private mTraverse(comparator: string, val: any[], dataset: any[]): any[] {
        let ret: any[];
        let fieldName = val[0];
        let num = val[1];
        // the filter funcition is learned from
        // https://stackoverflow.com/questions/46682845/javascript-filter-values-from-array
        ret = dataset.filter(function (e) {
            if (comparator === "EQ") {
                return e[fieldName] === num;
            }
            if (comparator === "GT") {
                return e[fieldName] > num;
            }
            if (comparator === "LT") {
                return e[fieldName] < num;
            }
        });
        return ret;
    }

    private sTraverse(comparator: string, val: any[], dataset: any[]): any[] {
        let ret: any[];
        let fieldName = val[0];
        let str = val[1];
        let valid: RegExp = new RegExp("^[*]?[^*]*[*]?$");
        let boo = valid.test(str);
        if (!boo) {
            throw new InsightError("invalid wildcard");
        }
        // the wildcard is learned from https://stackoverflow.com/questions/52143451/javascript-filter-with-wildcard
        let reg: RegExp = new RegExp("^" + str.replace(/\*/g, ".*") + "$");
        ret = dataset.filter(function (e) {
            let s = e[fieldName].toString();
            return reg.test(s);
        });
        return ret;
    }

    public negTraverse(comparator: string, node: any[], dataset: any[]): any[] {
        let ret: any[];
        for (let subNode of node) {
            ret = this.difference(dataset, this.generalFilter(subNode, dataset));
        }
        return ret;
    }

    // the code was learned from https://medium.com/@alvaro.saburido/set-theory-for-arrays-in-es6-eb2f20a61848
    public union(ar1: any[], ar2: any[]): any[] {
        return [...new Set([...ar1, ...ar2])];
    }

    // the code was learned from https://medium.com/@alvaro.saburido/set-theory-for-arrays-in-es6-eb2f20a61848
    public intersect(ary1: any[], ary2: any[]): any[] {
        return ary1.filter((x) => {
            return ary2.includes(x);
        });
    }

    // the code was learned from https://medium.com/@alvaro.saburido/set-theory-for-arrays-in-es6-eb2f20a61848
    public difference(ary1: any[], ary2: any[]): any[] {
        return  ary1.filter((x) => {
            return !ary2.includes(x);
        });
    }
}
