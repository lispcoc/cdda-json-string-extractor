const fs = require('fs')

//
// Functions
//
const copyObj = (a) => {
    return JSON.parse(JSON.stringify(a));
}
const cmpObj = (a, b) => {
    return (JSON.stringify(a) === JSON.stringify(b));
}

const isObj = (obj) => {
    return typeof obj === 'object';
}

/*
const isString = (obj) => {
    if (obj && typeof obj === 'object') {
        if ("str" in obj) {
            return isString(obj["str"]);
        }
    }
    return (typeof(obj) === "string" || obj instanceof String);
}
*/
const isString = (obj) => {
    return (typeof(obj) === "string" || obj instanceof String);
}

const getGtString = (obj, pl) => {
    if (obj && typeof obj === 'object') {
        const str = obj["str"];
        const str_pl =
            "str_pl" in obj ? obj["str_pl"] :
            "str_sp" in obj ? obj["str_sp"] :
            pl ? obj["str"] + 's' :
            obj["str"];
        const ctxt = "ctxt" in obj ? obj["ctxt"] : "";

        return {
            str: str,
            str_pl: str_pl,
            ctxt: ctxt
        };
    }
    if (typeof(obj) === "string" || obj instanceof String) {
        let str_pl = pl ? obj + 's' : obj;
        return {
            str: obj,
            str_pl: str_pl,
            ctxt: ""
        };
    }
    return null;
}

const listFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent =>
        dirent.isFile() ? [`${dir}/${dirent.name}`] : listFiles(`${dir}/${dirent.name}`)
    )

const toEveryString = (obj, type, key, fnc) => {
    if (isString(obj)) {
        fnc(obj, type, key);
    } else if (Array.isArray(obj)) {
        obj.forEach(e => toEveryString(e, type, key, fnc));
    } else if (obj && typeof obj === 'object') {
        if (isString(obj["type"])) {
            type = obj["type"];
        }
        for (key in obj) {
            toEveryString(obj[key], type, key, fnc);
        }
    }
}


const extract_string = (file, targets, datum, type, json, path = "") => {
    if (Array.isArray(json)) {
        for (let e in json) {
            extract_string(file, targets, datum, type, json[e], path + "/" + e);
        }
    } else if (isString(json)) {
        type = targets[type] ? type : "_other";
        targets[type].forEach(key => {
            let re = new RegExp(...key.regex);
            if (re.exec(path)) {
                //console.log(path);
                //console.log(key.regex);
                datum.push({ file: file, type: type, path: path, value: json });
            }
        });
    } else if (isObj(json)) {
        for (let e in json) {
            extract_string(file, targets, datum, type, json[e], path + "/" + e);
        }
    }
}

const extract_string_root = (file, targets, datum, json, path = "") => {
    if (Array.isArray(json)) {
        for (let e in json) {
            extract_string(file, targets, datum, json[e].type, json[e], path);
        }
    } else if (isObj(json)) {
        extract_string(file, targets, datum, json.type, json[e], path);
    }
}

//
// Main
//
try {
    let settings = JSON.parse(fs.readFileSync("settings.json", 'utf-8'));
    let targets = JSON.parse(fs.readFileSync("targets.json", 'utf-8'));

    json_files = listFiles(settings.mod_dir).filter(path => {
        return path.match(/\.json$/);
    });

    datum = [];

    json_files.forEach(file => {
        try {
            console.log("parsing " + file);
            const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
            extract_string_root(file, targets, datum, json);
        } catch (error) {
            console.log('Error: Something wrong with file "' + file + '"');
            console.log('Error: ' + error.message);
        } finally {}
    });

    try {
        const debug_file = fs.openSync(settings.output_debug, "w");
        datum.forEach(data => {
            fs.writeSync(debug_file, '# ' + data.file + '\n');
            fs.writeSync(debug_file, '# type: ' + data.type + ' path: ' + data.path + '\n');
            fs.writeSync(debug_file, data.value + '\n');
            fs.writeSync(debug_file, '\n');
        });
        fs.closeSync(debug_file);
    } catch (error) {
        console.log('Error: ' + error.message);
    } finally {}

    return;
    // checking duplicate
    try {
        console.log(datum.length + " strings found.");
        console.log("checking duplicate...");
        let new_datum = [];
        let temp = [];
        datum.forEach(data => {
            const ids = JSON.stringify(data.id);
            if (!temp.includes(ids)) {
                new_datum.push(data);
                temp.push(data);
            }
        });
        datum = new_datum;
        console.log(datum.length + " strings found.");
    } catch (error) {
        console.log('Error: ' + error.message);
    } finally {}

    // Generate po file
    try {
        const po = fs.openSync(settings.output_po, "w");
        datum.forEach(data => {
            fs.writeSync(po, data.comment + '\n');
            if (data.id.ctxt != "") {
                fs.writeSync(po, 'msgctxt "' + data.id.ctxt + '"\n');
            }
            fs.writeSync(po, 'msgid "' + data.id.str + '"\n');
            if (data.id.str === data.id.str_pl) {
                fs.writeSync(po, 'msgstr ""\n');
            } else {
                fs.writeSync(po, 'msgid_plural "' + data.id.str_pl + '"\n');
                fs.writeSync(po, 'msgstr[0] ""\n');
            }
            fs.writeSync(po, '\n');
        });
        fs.closeSync(po);
    } catch (error) {
        console.log('Error: ' + error.message);
    } finally {}

    // Generate csv file

} catch (error) {
    console.log('Error: ' + error.message);
} finally {

}