import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import Log from "../Util";
import {deleteFromDisk, duplicateChecking, notFoundChecking, saveToDisk, validityChecking} from "./AddDataSetHelper";
import {getValidCourseInfo} from "./AddCourseHelper";
import {getValidRoomInfo} from "./AddRoomHelper";
import {IIdKindSet, IInterface} from "./IInterface";
import * as JSZip from "jszip";
import * as fs from "fs";
import TransformQuery from "./QueryController/transformation";
import ProcessOption from "./QueryController/optionpart";
import TraverseData from "./QueryController/traverseData";
import ParseQuery, {IAstTree} from "./QueryController/parseQuery";
import ValidQuery from "./QueryController/validQuery";
import {error} from "util";
import {rename} from "fs";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public kindDataSetMap: IIdKindSet = {courses: {}, rooms: {}};
    public InsightDataSets: InsightDataset[] = [];
    constructor() {
        Log.trace("InsightFacade::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const dataAsPromises: Array<Promise<string>> = [];
        const validDataSet: any[] = [];
        try {
            validityChecking(id, content, kind);
            duplicateChecking(id, this.kindDataSetMap);
        } catch (e) {
            return Promise.reject(new InsightError(e));
        }
        const one = this.initializeKindHelper(content, kind, dataAsPromises);
        const four = this.getInfoHelper(one, dataAsPromises, kind, validDataSet, id, content);
        return this.dataSaving(four, id, kind);
    }

     public initializeKindHelper(content: string, kind: InsightDatasetKind, dataAsPromises: Array<Promise<string>>) {
        return JSZip.loadAsync(content, {base64: true}).then(function (zip: JSZip) {
            if (kind === InsightDatasetKind.Rooms) {
                if (!("rooms/" in zip.files)) {
                    throw new InsightError("No room in room");
                } else {
                    dataAsPromises.push(zip.folder("rooms").file("index.htm").async("text"));
                }
            } else {
                if (!("courses/" in zip.files)) {
                    throw new InsightError("No course in course");
                } else {
                    zip.forEach((relativePath, file) => {
                        if (file.dir) {
                            return;
                        }
                        dataAsPromises.push(file.async("text"));
                    });
                }
            }
        });
    }

    private async getInfoHelper(one: any, dataAsPromises: Array<Promise<string>>,
                                kind: InsightDatasetKind, validDataSet: any[], id: string, content: string) {
        const two = one.then(() => {
            return Promise.all(dataAsPromises);
        });
        const three = two.then(async () => {
            if (kind === InsightDatasetKind.Courses) {
                await getValidCourseInfo(await two, validDataSet);
            } else {
                await getValidRoomInfo(await two, validDataSet, content);
            }
        });
        return  three.then(() => {
            this.kindDataSetMap[kind][id] = validDataSet;
        });
    }

    private dataSaving(four: any, id: string, kind: InsightDatasetKind) {
        const five = four.then(() => {
            this.pushData(this.kindDataSetMap, id, kind);
        });
        const six = five.then(() => {
            return saveToDisk(id, "./data", this.kindDataSetMap);
        });
        return six.then(() => {
            // Log.trace(this.kindDataSetMap[kind]);
            let resultArray: string[] = [];
            let temp = this.InsightDataSets.length;
            for (let i = 0; i < temp; i ++) {
                let obj = this.InsightDataSets[i];
                resultArray.push(obj.id);
            }
            Log.trace(resultArray);
            return Promise.resolve(resultArray);
        }).catch((err: any) => {
            return Promise.reject(new InsightError(err));
        });
    }

    public async removeDataset(id: string): Promise<string> {
        if (!id || id.trim() === "" || id.includes("_") || id === "" ) {
            return (Promise.reject(new InsightError("Id is invalid! But this time in removeDataSet")));
        }
        try {
            notFoundChecking(id, this.kindDataSetMap);
        } catch (e) {
            return (await Promise.reject(new NotFoundError("Id Not Found In the end")));
        }
        if (this.kindDataSetMap["courses"][id]) {
            delete this.kindDataSetMap["courses"][id];
        } else if (this.kindDataSetMap["rooms"][id]) {
            delete this.kindDataSetMap["rooms"][id];
        }
        this.InsightDataSets = this.InsightDataSets.filter(function () {
            return id !== id;
        });
        await deleteFromDisk(id, "./data");
        return (Promise.resolve(id));
    }


    public listDatasets(): Promise<InsightDataset[]> {
        return (Promise.resolve(this.InsightDataSets));
    }

    private pushData(kindDataSetMap: IIdKindSet, id: string, kind: InsightDatasetKind) {
        let obj = kindDataSetMap[kind][id];
        let anInsightDataSet: InsightDataset =  {id: null, kind: null, numRows: null};
        anInsightDataSet.id = id;
        anInsightDataSet.kind = kind;
        anInsightDataSet.numRows = obj.length;
        this.InsightDataSets.push(anInsightDataSet);
        Log.trace(this.InsightDataSets);
    }

    public performQuery(query: any): Promise <any[]> {
        let instance = this;
        return new Promise(function (resolve, reject) {
            let ret: any[];
            try {
                // check if the query is valid
                let validQry: ValidQuery = new ValidQuery(instance.kindDataSetMap);
                validQry.checkQuery(query);
                let dataKind = validQry.dataKind;
                let datasetID = validQry.dataSetId;
                let colString = validQry.columnStr;
                let strorder = validQry.StrOrder;
                let objorder = validQry.ObjOrder;
                let trans = validQry.hasTrans;
                // if the query is valid, then we parse the query, build condition
                let parseQry: ParseQuery = new ParseQuery(query, datasetID, instance.kindDataSetMap[dataKind]);
                parseQry.buildAst(query["WHERE"]);
                let conditionTree: IAstTree = parseQry.astTree;
                if (!instance.kindDataSetMap[dataKind]) {
                    let load = require("fs");
                    let contents = load.readFileSync("./data/courses.json");
                    let jsonContent = JSON.parse(contents);
                    instance.kindDataSetMap[dataKind] = jsonContent[dataKind];
                }
                // traverse the data,organize the data hhhhhffff
                let traverser: TraverseData = new TraverseData(datasetID, dataKind);
                let filtered: any[] = traverser.filterValue(conditionTree, instance.kindDataSetMap[dataKind]);
                if (trans) {
                    let transformer: TransformQuery = new TransformQuery(dataKind, datasetID, filtered,
                        query["TRANSFORMATIONS"]);
                    let transformed: any[] = transformer.applyTransformation();
                    let optionProcessor: ProcessOption = new ProcessOption(datasetID, colString, strorder, objorder);
                    ret = optionProcessor.processOptionWithTrans(transformed);
                } else {
                    let optionProcessor: ProcessOption = new ProcessOption(datasetID, colString, strorder, objorder);
                    ret = optionProcessor.processOptionWithoutTrans(filtered);
                }
            } catch (e) {
                if (e instanceof InsightError) {
                    reject(e);
                }
                if (e instanceof ResultTooLargeError) {
                    reject(e);
                } else {
                    reject(new InsightError(e));
                }
            }
            resolve(ret);
        });

    }
}
