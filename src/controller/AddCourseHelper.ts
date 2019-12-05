import {InsightError} from "./IInsightFacade";
import Log from "../Util";

export class Course {
    public dept: string;
    public id: string;
    public avg: number;
    public instructor: string;
    public title: string;
    public pass: number;
    public fail: number;
    public audit: number;
    public uuid: string;
    public year: number;
}

export async function getValidCourseInfo(result: any[], validDataSet: any[]) {
    for (const res of result) {
        try {
            let jFile = JSON.parse(res);
            if (jFile["result"].length === 0) {
                continue;
            }
            for (let i of jFile.result) {
                let course: Course = buildCourses(i);
                validDataSet.push(course);
            }
        } catch (e) {
            // Log.error(e);
        }
    }
}

export function buildCourses(jFile: any): Course {
    let course: Course = {dept: null, avg: null, pass: null, audit: null,
        fail: null, year: null, uuid: null, title: null, id: null, instructor: null};
    try {
        course.dept = jFile.Subject;
        course.instructor = jFile.Professor;
        course.id = jFile.Course;
        course.title = jFile.Title;
        course.uuid = jFile.id.toString();
        if (jFile.Section === "overall") {
            course.year = 1900;
        } else {
            course.year = Number(jFile.Year);
        }
        course.fail = jFile.Fail;
        course.audit = jFile.Audit;
        course.pass = jFile.Pass;
        course.avg = jFile.Avg;
    } catch (e) {
        // return e;
    }
    return course;
}
