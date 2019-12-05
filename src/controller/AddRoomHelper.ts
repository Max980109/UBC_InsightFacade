import Log from "../Util";
import * as JSZip from "jszip";

interface IGeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

export class Room {
    public fullname: string;
    public shortname: string;
    public number: string;
    public name: string;
    public address: string;
    public lat: number;
    public lon: number;
    public seats: number;
    public type: string;
    public furniture: string;
    public href: string;
}

export async function getValidRoomInfo(result: any[], validDataSet: any[], content: string) {
        const parse5 = require("parse5");
        const document = parse5.parse(result[0]);
        // Log.trace(document);
        let table = findTable(document, "tbody");
        // Log.trace(table);
        for (let row of table.childNodes) {
            if (row.nodeName === "tr") {
                let rmaddress = row.childNodes[7].childNodes[0].value;
                await buildingHelper(row, content, validDataSet, rmaddress);
            }
        }
}

function buildingHelper(node: any, content: string, validDataSet: any[],
                        rmAddress: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
        // try {
            let href = node.childNodes[9].childNodes[1].attrs[0].value;
            let buildingName = href.substring(2);
            const zip = await JSZip.loadAsync(content, {base64: true});
            const data = await zip.files["rooms/" + buildingName].async("text");
            const parse5 = require("parse5");
            let buildingInformation = parse5.parse(data);
            // Log.trace(buildingInformation);
            let rmtable = findTable(buildingInformation, "tbody");
            let geoObj = await findGeoLocation(rmAddress);
            if (rmtable !== null) {
                for (let rmrow of rmtable.childNodes) {
                    if (rmrow.nodeName === "tr") {
                        roomHelper(rmrow, node, validDataSet, geoObj);
                    }
                }
            }
            return resolve(validDataSet);
        // } catch (e) {
        //     // Log.error(e);
        //     // return reject(e);
        // }
    });
}

function roomHelper(node: any, parentnode: any, validDataSet: any[],
                    geoObj: any) {
    let aRoom: Room = {
        fullname: null, shortname: null, number: null, name: null, address: null,
        lat: null, lon: null, seats: null, type: null, furniture: null, href: null
    };
    // try {
    aRoom.shortname = parentnode.childNodes[3].childNodes[0].value.trim();
    aRoom.fullname = parentnode.childNodes[5].childNodes[1].childNodes[0].value;
    aRoom.address = parentnode.childNodes[7].childNodes[0].value.trim();
    aRoom.href = node.childNodes[9].childNodes[1].attrs[0].value;
    aRoom.number = node.childNodes[1].childNodes[1].childNodes[0].value;
    aRoom.seats = Number(node.childNodes[3].childNodes[0].value.trim());
    aRoom.furniture = node.childNodes[5].childNodes[0].value.trim();
    aRoom.type = node.childNodes[7].childNodes[0].value.trim();
    aRoom.lat = geoObj.lat;
    aRoom.lon = geoObj.lon;
    aRoom.name = aRoom.shortname + "_" + aRoom.number;
    validDataSet.push(aRoom);
    // } catch (e) {
    //     Log.error(e);
    // }
}

function findGeoLocation(roomAddress: string): Promise<any> {
    return new Promise( function (resolve, reject) {
        let address: string = roomAddress;
        // Log.trace(address);
        let urlAddress = encodeURL(address);
        // Log.trace(urlAddress);
        const https = require("http");
        https.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team233/" + urlAddress, (resp: any) => {
            let data: string = "";
            resp.setEncoding("utf8");
            resp.on("data", (chunk: any) => {
                data += chunk;
            });
            resp.on("end", () => {
                // try {
                    let res: IGeoResponse = JSON.parse(data);
                    // Log.trace(res);
                    if (res.error === undefined) {
                        return resolve(res);
                    }
                    // } else {
                    //     Log.error("error type location");
                    // }
                // } catch (e) {
                //     Log.error("error type location");
                // }
            });
        });
        //     .on("error", (err: any) => {
        //     Log.trace("Error: " + err.message);
        // });
    });
}

function encodeURL(address: string): string {
    let str = address.trim();
    str = str.split(" ").join("%20");
    return str;
}

function findTable(documentFragment: any, tagName: string): any {
    if (!documentFragment || documentFragment.childNodes === undefined) {
        return null;
    }
    if (documentFragment.nodeName === tagName) {
        return documentFragment;
    }
    for (let child of documentFragment.childNodes) {
        let node = findTable(child, tagName);
        if (node !== null) {
            return node;
        }
    }
    return null;
}
