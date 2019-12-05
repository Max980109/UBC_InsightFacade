import {InsightDatasetKind} from "./IInsightFacade";

export interface IInterface {
    [Id: string]: any[];
}

export interface IIdKindSet {
    [InsightDatasetKind: string]: IInterface;
}

