import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs";
import {InsightDatasetKind} from "../src/controller/IInsightFacade";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        return server.start().then(() => {
            Log.trace("Server is started");
        }).catch(() => {
            Log.trace("Server is not started");
        });
    });

    after(function () {
        return server.stop().then(() => {
            Log.trace("Server is stopped");
        }).catch(() => {
            Log.trace("Server is not stopped");
        });
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });
    let coursedata = fs.readFileSync("test/data/courses.zip");
    let roomdata = fs.readFileSync("test/data/rooms.zip");
    let invaliddata = fs.readFileSync("test/data/mixedInvalidType.zip");
    let nullc: any = null;

    it("PUT for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(coursedata)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (course) is successful");
                    // Log.trace(res.body);
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    // it("PUT for courses dataset alternative", function () {
    //     try {
    //         return chai.request("http://localhost:4321")
    //             .put("/dataset/coursesalt/courses")
    //             .send(coursedata)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err);
    //         expect.fail();
    //     }
    // });
    //
    // it("PUT for courses dataset third", function () {
    //     try {
    //         return chai.request("http://localhost:4321")
    //             .put("/dataset/cout/courses")
    //             .send(coursedata)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 Log.trace(res.body);
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err);
    //         expect.fail();
    //     }
    // });

    it("PUT for courses dataset invalid", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(nullc)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (course) is NOT successful");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("PUT for courses dataset invalid lll", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(invaliddata)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (course) is NOT successful");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("PUT for courses dataset invalid 2", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/cou_rses/courses")
                .send(coursedata)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (course) is NOT successful");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("GET for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: Response) {
                    Log.trace("DataSet GET is successful");
                    expect(res.status).to.be.equal(200);
                    const expectedBody = [{id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612}];
                    expect(res.body).to.deep.equal({result: expectedBody});
                })
                .catch(function (err) {
                    expect.fail(err);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("PUT for courses dataset twice", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(coursedata)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (course) is NOT successful, Add twice!");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    it("POST for courses dataset", function () {
        let testQuery: any = {
            WHERE: {
                GT: {
                    courses_avg: 99.5
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg"
                ],
                ORDER: "courses_avg"
            }
        };
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(testQuery)
                .then(function (res: Response) {
                    Log.trace("DataSet POST is successful");
                    expect(res.body).to.deep.equal({
                        result: [
                            {courses_dept: "math", courses_avg: 99.78},
                            {courses_dept: "math", courses_avg: 99.78}]
                    });
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail(err);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("DEL for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: Response) {
                    Log.trace("DataSet DEL is successful");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail(err);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("DEL for courses dataset invalid", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/course_s")
                .then(function (res: Response) {
                    Log.trace("DataSet DEL is successful");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    it("DEL for courses dataset twice", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: Response) {
                    Log.trace("DataSet DEL is NOT successful (not found)");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    it("PUT for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .send(roomdata)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("DataSet PUT (rooms) is successful");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("GET for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: Response) {
                    Log.trace("DataSet GET is successful");
                    expect(res.status).to.be.equal(200);
                    const expectedBody = [{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364}];
                    expect(res.body).to.deep.equal({result: expectedBody});
                })
                .catch(function (err) {
                    expect.fail(err);
                });
        } catch (err) {
            Log.trace(err);
            expect.fail();
        }
    });

    it("Invalid POST for courses dataset", function () {
        let testQuery: any = {
            WHERE: {
                AND: [{
                    IS: {
                        rooms_furniture: "*Tables*"
                    }
                }, {
                    GT: {
                        rooms_seats: 300
                    }
                }]
            },
            OPTIONS: {
                COLUMNS: [
                    "rooms_shortname",
                    "maxSeats"
                ],
                ORDER: {
                    dir: "DOWN",
                    keys: ["maxSeats"]
                }
            },
            TRANSFORMATIONS: {
                GROUP: ["rooms_fullname"],
                APPLY: [{
                    maxSeats: {
                        MAX: "rooms_seats"
                    }
                }]
            }
        };
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(testQuery)
                .then(function (res: Response) {
                    Log.trace("DataSet POST is NOT successful (Invalid Query)");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace(err);
        }
    });
    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
