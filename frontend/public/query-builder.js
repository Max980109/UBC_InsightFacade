/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    // TODO: implement!
    let htmlDoc = document.getElementsByClassName("tab-panel active")[0];
    const datasetId = htmlDoc.getAttribute("data-type");
    let htmlConditions = htmlDoc.getElementsByClassName("form-group conditions")[0];
    let htmlColumns = htmlDoc.getElementsByClassName("form-group columns")[0];
    let htmlOrder = htmlDoc.getElementsByClassName("form-group order")[0];
    let htmlGroups = htmlDoc.getElementsByClassName("form-group groups")[0];
    let htmlTransformation = htmlDoc.getElementsByClassName("form-group transformations")[0];

    let where = wherePart(htmlConditions, datasetId);
    let columns = columnPart(htmlColumns, datasetId );
    let order = orderPart(htmlOrder, datasetId);
    let transformations = transPart(htmlGroups, htmlTransformation, datasetId);
    query["WHERE"] = where;
    let options = {};
    options["COLUMNS"] = columns;
    if (order) {
        options["ORDER"] = order;
    }
    query["OPTIONS"] = options;
    if (transformations) {
        query["TRANSFORMATIONS"] = transformations;
    }
    return query;
};

function wherePart(htmlcond, dataId) {
     let cond_typesAry = Array.from(htmlcond.getElementsByClassName("control-group condition-type")[0].children);
     let cond_type = cond_typesAry.filter(function (element) {
         return element.children[0].checked;
     });
     let cond_val;
     let logic_comparator;
     if(cond_type.length !== 0) {
         cond_val = cond_type[0].children[0].value;
     }
     if(cond_val === "all") {
         logic_comparator = "AND";
     } else if (cond_val === "any") {
         logic_comparator = "OR";
     } else if (cond_val === "none") {
         logic_comparator = "NOT";
     } else {
         logic_comparator = "";
     }
     let ret = {};
     let ary = [];
     const mField = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
     let cond_container = Array.from(htmlcond.querySelector(".conditions-container").children);
     if (cond_container.length === 0) {
         return ret;
     } else {
         for (let eachCondition of cond_container) {
             //check not first
             let ifNot = eachCondition.querySelector(".control.not").children[0].checked;
             //check fields
             let field;
             let control_field = Array.from(eachCondition.querySelector(".control.fields").children[0].
                 children);
             let selected_field = control_field.filter(function (option) {
                 return option.selected;
             });
             if (selected_field.length !== 0) {
                 field = dataId + "_" + selected_field[0].value;
             }
             //check operator
             let operator;
             let control_operators = Array.from(eachCondition.querySelector(".control.operators").children[0]);
             let selected_operator = control_operators.filter(function (option) {
                 return option.selected;
             });
             if (selected_operator.length !== 0) {
                 operator = selected_operator[0].value;
             }
             //check term
             let term = eachCondition.querySelector(".control.term").children[0].value;
             if (term) {
                 if (mField.includes(selected_field[0].value)) {
                     if (!isNaN(parseFloat(term))) {
                         term = parseFloat(term);
                     }
                 }
             }
             //push object
             let innerObj = {};
             let outerObj = {};
             let notObj = {};
             innerObj[field] = term;
             outerObj[operator] = innerObj;
             if (ifNot) {
                 notObj["NOT"] = outerObj;
                 ary.push(notObj);
             } else {
                 ary.push(outerObj);
             }
         }
         if (logic_comparator === "OR" || logic_comparator === "AND" || logic_comparator === "") {
             if (ary.length === 1) {
                 ret = ary[0];
             } else {
                 ret[logic_comparator] = ary;
             }
             return ret;
         } else if (logic_comparator === "NOT") {
             let obj = {};
             if (ary.length === 1) {
                 ret = ary[0];
                 obj["NOT"] = ret;
             } else {
                 let subObj = {};
                 subObj["OR"] = ary;
                 obj["NOT"] = subObj;
             }
             return obj;
         }
     }
}

function columnPart(htmlColumns, datasetID) {
    let ret;
    let control_column = Array.from(htmlColumns.querySelector(".control-group").children);
    let control_fields = control_column.filter(function (field) {
        return field.children[0].checked;
    });
    ret = control_fields.map(function (field) {
        if(field.className === "control field") {
            return datasetID + "_" + field.children[0].value;
        } else if (field.className === "control transformation") {
            return field.children[0].value;
        }
    });
    return ret;
}

function orderPart(htmlOrder, datasetId) {
    let control_group = htmlOrder.children[1];
    let control_fields = Array.from(control_group.querySelector(".control.order.fields").children[0].children);
    let selected_fields = control_fields.filter(function (option) {
        return option.selected;

    });
    let field = selected_fields.map(function (option) {
        if (option.className === "transformation") {
            return  option.value;
        } else {
            return datasetId + "_" + option.value;
        }
    });
    let control_descending = control_group.querySelector(".control.descending");
    let ifDesc = control_descending.children[0].checked;
    if (field.length === 0) {
        return undefined;
    } else if (field.length === 1 && !ifDesc) {
        return field[0];
    } else if(ifDesc) {
        let ret = {};
        ret["dir"] = "DOWN";
        ret["keys"] = field;
        return ret;
    } else if(field.length > 1) {
        let ret = {};
        ret["dir"] = "UP";
        ret["keys"] = field;
        return ret;
    }
}
function transPart(htmlGroups, htmlTransformation, datasetID) {
    let ret = {};
    let control_group = htmlGroups.children[1];
    let control_fields = Array.from(control_group.children);
    let selected_fields = control_fields.filter(function (control_field) {
        return control_field.children[0].checked;
    });
    let group_fields = selected_fields.map(function (control_field) {
        return datasetID + "_" + control_field.children[0].value;
    });
    let applyArray = [];
    let control_transformation = Array.from(htmlTransformation.children[1].children);
    for (let trans of control_transformation) {
        let term = trans.querySelector(".control.term").children[0].value;
        let control_operators = Array.from(trans.querySelector(".control.operators").children[0].children);
        let selected_option_operators = control_operators.filter(function (option) {
            return option.selected;
        });
        let selected_operators = selected_option_operators.map(function (op) {
            return op.value;
        });
        let control_fields = Array.from(trans.querySelector(".control.fields").children[0].children);
        let selected_option_fields = control_fields.filter(function (option) {
            return option.selected;
        });
        let selected_fields = selected_option_fields.map(function (option) {
            return datasetID + "_" + option.value;
        });
        let innerObj = {};
        innerObj[selected_operators[0]] = selected_fields[0];
        let outerObj = {};
        outerObj[term] = innerObj;
        applyArray.push(outerObj);
    }
    if (group_fields.length === 0 && applyArray.length === 0){
        return undefined;
    } else {
        ret["GROUP"] = group_fields;
        ret["APPLY"] = applyArray;
        return ret;
    }
}


