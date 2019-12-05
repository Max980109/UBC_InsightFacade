import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import Scheduler, {
    caculateMidPoint,
    containRm,
    containSec,
    isSameCourse,
    matchHelper, roomDistanceHelper
} from "../src/scheduler/Scheduler";
import {SchedRoom, SchedSection, TimeSlot} from "../src/scheduler/IScheduler";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        mixedInvalidType: "./test/data/mixedInvalidType.zip",
        mixedSection: "./test/data/mixedSection.zip",
        onlyInvalidSection: "./test/data/onlyInvalidSection.zip",
        onlyValidSection: "./test/data/onlyValidSection.zip",
        png: "./test/data/png.zip",
        empty: "./test/data/empty.zip",
        comm: "./test/data/Comm.zip",
        picture: "./test/data/picture.jpg",
        invSection: "./test/data/invSection.zip",
        rooms: "./test/data/rooms.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    // add
    it("id contains underscore", async () => {
        const id: string = "courses_";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }

    });

    it("id contains only white space", async () => {
        const id: string = "   ";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("id is empty string", async () => {
        const id: string = "";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("id is duplicate course", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("id is duplicate room", async () => {
        const id: string = "rooms";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    // it("id is course room", async () => {
    //     const id: string = "rooms";
    //     const id2: string = "courses";
    //     let response: string[];
    //     try {
    //         response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
    //         response = await insightFacade.addDataset(id2, datasets[id], InsightDatasetKind.Courses);
    //     } catch (err) {
    //         response = err;
    //     } finally {
    //         expect(response).to.deep.equal(["rooms, courses"]);
    //     }
    // });
    it("id is null", async () => {
        const id: string = "null";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("id is undefined", async () => {
        const id: string = undefined;
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("add two datasets courses and rooms", async () => {
        const id1: string = "courses";
        const id2: string = "rooms";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            response = await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            Log.trace(response);
            expect(response).to.deep.equal(["courses", "rooms"]);
        }
    });
    // content
    it("content is invalid path", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, "./test/data/Comm.zip", InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("content is empty string ", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, "", InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("set with no concrete path", async () => {
        const id: string = "asdfsdf";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("content is null", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, null, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("content is undefined", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, undefined, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // kind
    it("wrong kind", async () => {
        const id: string = "courses";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // zip file
    it("empty zip file", async () => {
        const id: string = "empty";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("only have invalid section", async () => {
        const id: string = "onlyInvalidSection";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("png file", async () => {
        const id: string = "png";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("it is not a zip file", async () => {
        const id: string = "picture";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("it is invSection", async () => {
        const id: string = "invSection";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // remove
    it("remove a dataset successfully", async () => {
        const id: string = "courses";
        let response: string;
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
        }
    });
    it("remove a dataset Id empty", async () => {
        const id: string = "";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("remove a dataset Id underfine", async () => {
        const id: string = undefined;
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("remove a dataset Id null", async () => {
        const id: string = null;
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("remove same set twice", async () => {
        const id: string = "courses";
        let response: string;
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.removeDataset(id);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("remove dataset not added", async () => {
        const id: string = "courses";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("remove same set twice Room", async () => {
        const id: string = "rooms";
        let response: string;
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
            response = await insightFacade.removeDataset(id);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("remove dataset not added Room", async () => {
        const id: string = "rooms";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    // dataset
    it("Add valid datasets and list", async () => {
        const id: string = "courses";
        let response: InsightDataset[];
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.deep.equal([{id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612}]);
        }
    });
    it("No datasets", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.length).to.be.equal(0);
        }
    });
    it("Add Room", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });
    it("Remove Room", async function () {
        const id: string = "rooms";
        let response: string;
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
        }
    });
    it("List Room", async function () {
        const id: string = "rooms";
        let response: InsightDataset[];
        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.deep.equal([{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364}]);
        }
    });
    let sections = [
        {
            courses_dept: "cpsc",
            courses_id: "340",
            courses_uuid: "1319",
            courses_pass: 101,
            courses_fail: 7,
            courses_audit: 2
        },
        {
            courses_dept: "cpsc",
            courses_id: "340",
            courses_uuid: "3397",
            courses_pass: 171,
            courses_fail: 3,
            courses_audit: 1
        },
        {
            courses_dept: "cpsc",
            courses_id: "344",
            courses_uuid: "62413",
            courses_pass: 93,
            courses_fail: 2,
            courses_audit: 0
        },
        {
            courses_dept: "cpsc",
            courses_id: "344",
            courses_uuid: "72385",
            courses_pass: 43,
            courses_fail: 1,
            courses_audit: 0
        }
    ];

    const rooms = [
        {
            rooms_shortname: "AERL",
            rooms_number: "120",
            rooms_seats: 144,
            rooms_lat: 49.26372,
            rooms_lon: -123.25099
        },
        {
            rooms_shortname: "ALRD",
            rooms_number: "105",
            rooms_seats: 94,
            rooms_lat: 49.2699,
            rooms_lon: -123.25318
        },
        {
            rooms_shortname: "ANGU",
            rooms_number: "098",
            rooms_seats: 260,
            rooms_lat: 49.26486,
            rooms_lon: -123.25364
        },
        {
            rooms_shortname: "BUCH",
            rooms_number: "A101",
            rooms_seats: 275,
            rooms_lat: 49.26826,
            rooms_lon: -123.25468
        },
        {
            rooms_shortname: "BUCH",
            rooms_number: "D204",
            rooms_seats: 40,
            rooms_lat: 49.26826,
            rooms_lon: -123.25468,
            },
        {
            rooms_shortname: "ALRD",
            rooms_number: "112",
            rooms_seats: 20,
            rooms_lat: 49.2699,
            rooms_lon: -123.25318 },
        {
            rooms_shortname: "SWNG",
            rooms_number: "305",
            rooms_seats: 47,
            rooms_lat: 49.26293,
            rooms_lon: -123.25431
        },
        {
            rooms_shortname: "DMP",
            rooms_number: "310",
            rooms_seats: 160,
            rooms_lat: 49.26125,
            rooms_lon: -123.24807
        }
    ];
    it("IScheduler",  function () {
        let scheduler: Scheduler = new Scheduler();
        let response: any;
        try {
            response = scheduler.schedule(sections, rooms);
            Log.trace(response);
        } catch (err) {
            Log.error(err);
        }
    });

    it("IScheduler Small Methods",  function () {
        let id = "d";
        let ids = ["d", "ee"];
        let section: SchedSection = {
            courses_dept: "cpsc",
            courses_id: "344",
            courses_uuid: "72385",
            courses_pass: 43,
            courses_fail: 1,
            courses_audit: 0
        };
        let result: number[];
        // Log.trace(sections);
        // removeSec(sections, section);
        // Log.trace(sections);
        result = caculateMidPoint(rooms);
        // Log.trace(result);
        roomDistanceHelper(rooms, result);
        expect(isSameCourse(id, ids)).to.be.equal(true);
    });

    it("IScheduler MatchHelper",  function () {
        let room: SchedRoom = {
            rooms_shortname: "AERL",
            rooms_number: "120",
            rooms_seats: 144,
            rooms_lat: 49.26372,
            rooms_lon: -123.25099
        };
        let section: SchedSection = {
            courses_dept: "cpsc",
            courses_id: "344",
            courses_uuid: "72385",
            courses_pass: 43,
            courses_fail: 1,
            courses_audit: 0
        };
        let time: TimeSlot = "MWF 0800-0900";
        let retval: Array<[SchedRoom, SchedSection, TimeSlot]> = new Array<[SchedRoom, SchedSection, TimeSlot]>();
        let triedCourses: SchedSection[] = [];
        let triedRooms: SchedRoom[] = [];
        Log.trace(sections.some(function (rm) {
            return rm.courses_uuid === section.courses_uuid;
        }));
        let finishedSections: SchedSection[] = [];
        matchHelper(section, room, time, sections, retval, triedCourses, triedRooms, finishedSections);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade = new InsightFacade();
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
