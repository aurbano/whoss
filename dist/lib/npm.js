"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bluebird_1 = require("bluebird");
var license_checker_1 = require("license-checker");
var path_1 = require("path");
var fs_jetpack_1 = require("fs-jetpack");
var os_1 = require("os");
var util_1 = require("./util");
var licenseCheckerCustomFormat = {
    name: '',
    version: '',
    description: '',
    repository: '',
    publisher: '',
    email: '',
    url: '',
    licenses: '',
    licenseFile: '',
    licenseModified: false
};
function getNpmLicenses(options) {
    var npmDirs;
    if (!Array.isArray(options.baseDir)) {
        npmDirs = [options.baseDir];
    }
    else {
        npmDirs = options.baseDir;
    }
    // first - check that this is even an NPM project
    for (var i = 0; i < npmDirs.length; i++) {
        if (!fs_jetpack_1.default.exists(path_1.default.join(npmDirs[i], 'package.json'))) {
            console.log('Directory at "' +
                npmDirs[i] +
                '" does not look like an NPM project, skipping NPM checks for path ' +
                npmDirs[i]);
            return [];
        }
    }
    console.log('Looking at directories: ' + npmDirs);
    var checkers = [];
    var _loop_1 = function (i) {
        checkers.push(bluebird_1.default.fromCallback(function (cb) {
            var dir = npmDirs[i];
            return license_checker_1.default.init({
                start: npmDirs[i],
                production: true,
                customFormat: licenseCheckerCustomFormat
            }, function (err, json) {
                if (err) {
                    console.error(err);
                }
                else {
                    Object.getOwnPropertyNames(json).forEach(function (k) {
                        json[k]['dir'] = dir;
                    });
                }
                cb(err, json);
            });
        }));
    };
    for (var i = 0; i < npmDirs.length; i++) {
        _loop_1(i);
    }
    if (checkers.length === 0) {
        return [];
    }
    return bluebird_1.default
        .all(checkers)
        .then(function (rawResult) {
        // the result is passed in as an array, one element per npmDir passed in
        // de-dupe the entries and merge it into a single object
        var merged = {};
        for (var i = 0; i < rawResult.length; i++) {
            merged = Object.assign(rawResult[i], merged);
        }
        return merged;
    })
        .then(function (result) {
        // we want to exclude the top-level project from being included
        var dir = result[Object.keys(result)[0]]['dir'];
        var topLevelProjectInfo = fs_jetpack_1.default.read(path_1.default.join(dir, 'package.json'), 'json');
        var keys = Object.getOwnPropertyNames(result).filter(function (k) {
            return k !== topLevelProjectInfo.name + "@" + topLevelProjectInfo.version;
        });
        return bluebird_1.default.map(keys, function (key) {
            console.log('processing', key);
            var packageInfo = result[key];
            var defaultPackagePath = packageInfo['dir'] + "/node_modules/" + packageInfo.name + "/package.json";
            return fs_jetpack_1.default
                .existsAsync(defaultPackagePath)
                .then(function (itemAtPath) {
                if (itemAtPath === 'file') {
                    return [defaultPackagePath];
                }
                else {
                    return fs_jetpack_1.default.findAsync(packageInfo['dir'], {
                        matching: "**/node_modules/" + packageInfo.name + "/package.json"
                    });
                }
            })
                .then(function (packagePath) {
                if (packagePath && packagePath[0]) {
                    return fs_jetpack_1.default.read(packagePath[0], 'json');
                }
                else {
                    return Promise.reject(packageInfo.name + ": unable to locate package.json");
                }
            })
                .then(function (packageInfo) {
                console.log('Processing', packageInfo.name, 'for authors and licenseText');
                var props = {
                    authors: [],
                    licenseText: ''
                };
                props.authors =
                    (packageInfo.author && util_1.getAttributionForAuthor(packageInfo.author)) ||
                        (packageInfo.contributors &&
                            packageInfo.contributors
                                .map(function (c) {
                                return util_1.getAttributionForAuthor(c);
                            })
                                .join(', ')) ||
                        (packageInfo.maintainers &&
                            packageInfo.maintainers
                                .map(function (m) {
                                return util_1.getAttributionForAuthor(m);
                            })
                                .join(', '));
                var licenseFile = packageInfo.licenseFile;
                if (licenseFile &&
                    fs_jetpack_1.default.exists(licenseFile) &&
                    path_1.default.basename(licenseFile).match(/license/i)) {
                    props.licenseText = fs_jetpack_1.default.read(licenseFile);
                }
                else {
                    props.licenseText = '';
                }
                return props;
            })
                .catch(function (e) {
                console.warn(e);
                return {
                    authors: '',
                    licenseText: ''
                };
            })
                .then(function (derivedProps) {
                return {
                    ignore: false,
                    name: packageInfo.name,
                    version: packageInfo.version,
                    authors: derivedProps.authors,
                    url: packageInfo.repository,
                    license: packageInfo.licenses,
                    licenseText: derivedProps.licenseText
                };
            });
        }, {
            concurrency: os_1.default.cpus().length
        });
    });
}
exports.getNpmLicenses = getNpmLicenses;
//# sourceMappingURL=npm.js.map