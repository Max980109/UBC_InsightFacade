
import {InsightError} from "../IInsightFacade";
import {IInterface} from "../IInterface";

export interface IAstTree {
    key: string;
    val: any[];
    node: any[];
}

export default class ParseQuery {
    public qry: any;
    public dataSetID: string;
    public dataSet: IInterface;
    public courseNumType: string[] = ["avg", "pass", "fail", "audit", "year"];
    public courseStrType: string[] = ["dept", "id", "instructor", "title", "uuid"];
    public roomNumType: string[] = ["lat", "lon", "seats"];
    public roomStrType: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    public astTree: IAstTree = {key: "", val: [], node: []};

    constructor(query: any, dataType: string, dataSet: IInterface) {
        this.qry = query;
        this.dataSetID = dataType;
        this.dataSet = dataSet;

    }

    public buildAst(where: any): IAstTree {
        if (Object.keys(where).length === 0) {
            return this.astTree;
        } else {
            this.buildAstHelper(where, this.astTree);
        }
    }

    public logicalComparison(insideCom: any, tree: IAstTree, comparator: string) {
        tree.key = comparator;
        if (!Array.isArray(insideCom)) {
            throw new InsightError("and and or inside should be array");
        }
        if (insideCom.length < 1) {
            throw new InsightError("there is no element in the array");
        }
        let ct = 0;
        while (ct < insideCom.length) {
            let subObj = insideCom[ct];
            if (typeof subObj !== "object") {
                throw new InsightError("the inside should be an obj");
            }
            if (Object.keys(subObj).length === 0) {
                throw new InsightError("empty sub obj");
            }
            let newNode: IAstTree = {key: "", val: [], node: []};
            tree.node.push(newNode);
            this.buildAstHelper(subObj, newNode);
            ct++;
        }
    }

    public Mcomparison(insideCom: any, tree: IAstTree, comparator: string) {
        tree.key = comparator;
        if (Array.isArray((insideCom))) {
            throw new InsightError("inside m comparator should have no arrays");
        }
        if (Object.keys(insideCom).length !== 1) {
            throw new InsightError("inside m comparator should only have one key pair");
        }
        let keys = Object.keys(insideCom);
        for (let key of keys) {
            let str: string = key;
            if (str.includes("_")) {
                let strs = str.split("_");
                if (strs.length > 2) {
                    throw new InsightError("invalid strs");
                }
                let setName = strs[0];
                let field = strs[1];
                let num = insideCom[key];
                if (setName === this.dataSetID && typeof num === "number" &&
                    this.courseNumType.includes(field) ) {
                    tree.val = [field, num ];
                } else if (setName === this.dataSetID && typeof num === "number" &&
                    this.roomNumType.includes(field)) {
                    tree.val = [field, num];
                } else {
                    throw new InsightError("m filed query is not valid");
                }
            } else {
                throw new InsightError("invalid input string");
            }
        }
    }

    public Scomparison(insideCom: any, tree: IAstTree, comparator: string) {
        tree.key = comparator;
        if (Array.isArray((insideCom))) {
            throw new InsightError("inside m comparator should have no arrays");
        }
        if (Object.keys(insideCom).length !== 1) {
            throw new InsightError("inside m comparator should only have one key pair");
        }
        let keys = Object.keys(insideCom);
        for (let key of keys) {
            let str: string = key;
            if (str.includes("_")) {
                let strs = str.split("_");
                if (strs.length > 2) {
                    throw new InsightError("invalid strs");
                }
                let setName = strs[0];
                let field = strs[1];
                let inputString = insideCom[key];
                if (setName === this.dataSetID && typeof inputString === "string" &&
                    this.courseStrType.includes(field) ) {
                    tree.val = [field, inputString];
                } else if (setName === this.dataSetID && typeof inputString === "string" &&
                    this.roomStrType.includes(field)) {
                    tree.val = [field, inputString];
                } else {
                    throw new InsightError("s filed query is not valid");
                }
            } else {
                throw new InsightError("invalid input string");
            }
        }
    }

    public negComparison(insideCom: any, tree: IAstTree, comparator: string) {
        tree.key = comparator;
        if (typeof insideCom !== "object") {
            throw new InsightError("not an object for neg");
        }
        if (Array.isArray((insideCom))) {
            throw new InsightError("inside neg comparator should have no arrays");
        }
        if (Object.keys(insideCom).length !== 1) {
            throw new InsightError("inside neg comparator should only have one key pair");
        }
        let newNode: IAstTree = {key: "", val: [], node: []};
        tree.node.push(newNode);
        this.buildAstHelper(insideCom, newNode);
    }

    private buildAstHelper(where: any, tree: IAstTree) {
        let keys = Object.keys(where);
        for (const comparator of keys ) {
            if (comparator === "AND" || comparator === "OR") {
                this.logicalComparison(where[comparator], tree, comparator);
            } else if (comparator === "EQ" || comparator === "GT" || comparator === "LT") {
                this.Mcomparison(where[comparator], tree, comparator);
            } else if (comparator === "IS") {
                this.Scomparison(where[comparator], tree, comparator);
            } else if (comparator === "NOT") {
                this.negComparison(where[comparator], tree, comparator);
            } else {
                throw new InsightError("invalid comparator in where");
            }
        }
    }
}
