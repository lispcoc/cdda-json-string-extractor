const fs = require('fs');

class CJX {
    static targets = {};
    static settings = {};
}

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
    if (obj && typeof obj === 'object') {
        if ("str" in obj) {
            obj = obj["str"];
        } else if ("str_sp" in obj) {
            obj = obj["str_sp"];
        }
    }
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

const get_singular = (obj) => {
    if (typeof(obj) === "string" || obj instanceof String) {
        return obj;
    }
    if (obj["str"]) {
        return obj["str"];
    }
    if (obj["str_sp"]) {
        return obj["str_sp"];
    }
    return null;
}
const get_plural = (obj) =>{
    if (typeof(obj) === "string" || obj instanceof String) {
        return obj + "s";
    }
    if (obj["str_pl"]) {
        return obj["str_pl"];
    }
    return get_singular(obj) + "s";
}


const extract_string = (file, datum, type, json, path = "", current = "") => {
    if (Array.isArray(json)) {
        for (let e in json) {
            extract_string(file, datum, type, json[e], path + "/" + e, e);
        }
    } else if (isString(json)) {
        let process_type = CJX.targets[type] ? type : "_other";
        CJX.targets[process_type].forEach(key => {
            let str = get_singular(json);
            let str_pl = null;
            if (CJX.settings.needs_plural_name.includes(type)) {
                if(current === "name") {
                    str_pl = get_plural(json);
                }
            }
            if (CJX.settings.needs_plural_desc.includes(type)) {
                if(current === "description") {
                    str_pl = get_plural(json);
                }
            }
            let re = new RegExp(...key.regex);
            if (re.exec(path)) {
                if (key.special == "recipe_category_id") {
                    str = str.split("_")[1];
                }
                if (key.special == "recipe_category_recipe_subcategories") {
                    if (str == "CSC_ALL") {
                        str = "ALL";
                    } else {
                        str = str.split("_")[2];
                    }
                }
                datum.push({ file: file, type: type, path: path, ctxt: key.ctxt, str: str,str_pl: str_pl });
            }
        });
    } else if (isObj(json)) {
        for (let e in json) {
            extract_string(file, datum, type, json[e], path + "/" + e, e);
        }
    }
}

const extract_string_root = (file, datum, json, path = "") => {
    if (Array.isArray(json)) {
        for (let e in json) {
            extract_string(file, datum, json[e].type, json[e], path);
        }
    } else if (isObj(json)) {
        extract_string(file, datum, json.type, json[e], path);
    }
}

//
// Main
//
try {
    CJX.settings = JSON.parse(fs.readFileSync("settings.json", 'utf-8'));
    CJX.targets = JSON.parse(fs.readFileSync("targets.json", 'utf-8'));

    json_files = listFiles(CJX.settings.mod_dir).filter(path => {
        return path.match(/\.json$/);
    });

    datum = [];

    json_files.forEach(file => {
        try {
            console.log("parsing " + file);
            const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
            extract_string_root(file, datum, json);
        } catch (error) {
            console.log('Error: Something wrong with file "' + file + '"');
            console.log('Error: ' + error.message);
        } finally {}
    });

    try {
        const debug_file = fs.openSync(CJX.settings.output_po, "w");
        datum.forEach(data => {
            fs.writeSync(debug_file, '# ' + data.file + '\n');
            fs.writeSync(debug_file, '# type: ' + data.type + ' ' + data.path + '\n');
            if (data.ctxt) {
                fs.writeSync(debug_file, 'ctxt "' + data.ctxt + '"\n');
            }
            fs.writeSync(debug_file, 'msgid "' + data.str + '"\n');
            if (data.str_pl) {
                fs.writeSync(debug_file, 'msgid_plural "' + data.str_pl + '"\n');
                fs.writeSync(debug_file, 'msgstr[0] ""\n');
            } else {
                fs.writeSync(debug_file, 'msgstr ""\n');
            }
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