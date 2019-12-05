import {InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {IIdKindSet} from "./IInterface";
import * as fs from "fs";
import Log from "../Util";

export function validityChecking(id: string, content: string, kind: InsightDatasetKind): boolean {
    if (!id || id.trim() === "" || id.includes("_") || id === "" ) {
        throw new InsightError("Id is invalid!");
    }
    if (!content) {
        throw new InsightError("Content is invalid!");
    }
    return false;
}

export function duplicateChecking(id: string, kindDataSetMap: IIdKindSet): boolean {
    if (kindDataSetMap.courses) {
        if (kindDataSetMap.courses[id]) {
            throw new InsightError("Duplicate ID for Course, should be rejected");
        }
    }
    if (kindDataSetMap.rooms) {
        if (kindDataSetMap.rooms[id]) {
            throw new InsightError("Duplicate ID for Room, should be rejected");
        }
    }
    return false;
}

export function notFoundChecking(id: string, kindDataSetMap: IIdKindSet): boolean {
    if (kindDataSetMap.courses) {
        if (!kindDataSetMap.courses[id] && !kindDataSetMap.rooms[id]) {
            throw new NotFoundError("Course Not Found");
        }
    }
    return false;
}

export const saveToDisk = async (fName: string, dirAddress: string,  data: IIdKindSet) => {
    return new Promise ((resolve, reject) => {
        fs.writeFile(`${dirAddress}/${fName}.json`, JSON.stringify(data), (() => {
            return resolve(fName);
        }));
    });
};

export const deleteFromDisk = async (fName: string, dirAddress: string) => {
    return new Promise ((resolve, reject) => {
        fs.unlink(dirAddress + "/" + fName + ".json", (() => {
            return resolve(fName);
        }));
    });
};
