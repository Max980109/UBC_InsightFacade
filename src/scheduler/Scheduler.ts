import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

export function isSameCourse(sectionId: string, triedCoursesID: string[]): boolean {
    return triedCoursesID.some(function (element) {
        return element === sectionId;
    });
}

// This code is derived from https://www.movable-type.co.uk/scripts/latlong.html
// Provided in the D3 spec

export function calculateDistance(lat1: number, lat2: number, lon1: number, lon2: number): number {
    let R = 6371e3; // metres
    let φ1 = toRadians(lat1);
    let φ2 = toRadians(lat2);
    let Δφ = toRadians(lat2 - lat1);
    let Δλ = toRadians(lon2 - lon1);

    function toRadians(degrees: number) {
        let pi = Math.PI;
        return degrees * (pi / 180);
    }
    let a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function matchHelper(section: SchedSection, room: SchedRoom, time: TimeSlot, sections: SchedSection[],
                            retval: Array<[SchedRoom, SchedSection, TimeSlot]>, triedCoursesID: any[],
                            triedRooms: SchedRoom[], finishedSections: SchedSection[]) {
    if (section.courses_pass + section.courses_fail + section.courses_audit <= room.rooms_seats) {
        let pairup: [SchedRoom, SchedSection, TimeSlot] = [room, section, time];
        retval.push(pairup);
        // removeSec(sections, section);
        triedCoursesID.push(section.courses_dept + section.courses_id);
        triedRooms.push(room);
        finishedSections.push(section);
        return true;
    }
    return false;
}

export function containSec(sections: SchedSection[], section: SchedSection): boolean {
    return sections.some(function (sec) {
        return sec.courses_uuid === section.courses_uuid;
    });
}

export function containRm(rooms: SchedRoom[], room: SchedRoom): boolean {
    return rooms.some(function (rm) {
        return rm.rooms_shortname + rm.rooms_number === room.rooms_shortname + room.rooms_number;
    });
}
export function checkHelper(section: SchedSection, triedCoursesID: any[], triedRooms: SchedRoom[],
                            room: SchedRoom, sections: SchedSection[], finishedSections: SchedSection[]): boolean {
    let b1 = !containSec(finishedSections, section);
    let b2 = !containRm(triedRooms, room);
    let b3 = !isSameCourse(section.courses_dept + section.courses_id, triedCoursesID);
    return b1 && b2 && b3;
}

export function caculateMidPoint(rooms: SchedRoom[]): number[] {
    let sumlat: number = 0;
    let sumlon: number = 0;
    let n: number = rooms.length;
    for (let room of rooms)  {
        sumlat += room.rooms_lat;
        sumlon += room.rooms_lon;
    }
    return [sumlat / n, sumlon / n];
}

export function roomDistanceHelper(rooms: SchedRoom[], geomeidan: number[]) {
    for (let room of rooms) {
        let distance: number;
        distance = calculateDistance(room.rooms_lat, geomeidan[0], room.rooms_lon, geomeidan[1]);
        room.rooms_distance = distance;
        // Log.trace(room.rooms_distance);
    }
}

export default class Scheduler implements IScheduler {

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        const retval: Array<[SchedRoom, SchedSection, TimeSlot]> = new Array<[SchedRoom, SchedSection, TimeSlot]>();
        const finishedSections: SchedSection[] = [];
        sections.sort(((a, b) => a.courses_audit + a.courses_fail
            + a.courses_pass < b.courses_audit + b.courses_fail + b.courses_pass ? 1 :
                a.courses_audit + a.courses_fail
                + a.courses_pass > b.courses_audit + b.courses_fail + b.courses_pass ? -1 : 0));
        let geomeidan: number[];
        geomeidan = caculateMidPoint(rooms);
        roomDistanceHelper(rooms, geomeidan);
        rooms.sort(((a, b) => a.rooms_seats < b.rooms_seats ? 1 : a.rooms_seats > b.rooms_seats ? -1 : 0));
        Log.trace(rooms);
        // Log.trace(rooms);
        // Log.trace(sections);
        const timeTable: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100",
        "MWF 1100-1200", "MWF 1200-1300", "MWF 1300-1400",
        "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
        "TR  0800-0930", "TR  0930-1100", "TR  1100-1230",
        "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];

        // Log.trace(timeTable);
        for (let time of timeTable) {
            // Log.trace(time);
            const triedCoursesID: any[] = [];
            const triedRooms: SchedRoom[] = [];
            for (let section of sections) {
                // Log.trace(section);
                for (let room of rooms) {
                    // let b = checkHelper(section, triedCoursesID, triedRooms, room, sections, finishedSections);
                    // Log.trace(b);
                    if (checkHelper(section, triedCoursesID, triedRooms, room, sections, finishedSections)) {
                    // Log.trace(room);
                        matchHelper(section, room, time, sections, retval,
                            triedCoursesID, triedRooms, finishedSections);
                    }
                }
            }
        }
        return retval;
    }
}
