import bluebird from 'bluebird';
import npmchecker from 'license-checker';
import path from 'path';
import jetpack from 'fs-jetpack';
import os from 'os';
import { getAttributionForAuthor } from './util';
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
export function getNpmLicenses(options) {
    var npmDirs;
    if (!Array.isArray(options.baseDir)) {
        npmDirs = [options.baseDir];
    }
    else {
        npmDirs = options.baseDir;
    }
    // first - check that this is even an NPM project
    for (var i = 0; i < npmDirs.length; i++) {
        if (!jetpack.exists(path.join(npmDirs[i], 'package.json'))) {
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
        checkers.push(bluebird.fromCallback(function (cb) {
            var dir = npmDirs[i];
            return npmchecker.init({
                start: npmDirs[i],
                production: true,
                customFormat: licenseCheckerCustomFormat
            }, function (err, json) {
                if (err) {
                    //Handle error
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
    return bluebird
        .all(checkers)
        .then(function (raw_result) {
        // the result is passed in as an array, one element per npmDir passed in
        // de-dupe the entries and merge it into a single object
        var merged = {};
        for (var i = 0; i < raw_result.length; i++) {
            merged = Object.assign(raw_result[i], merged);
        }
        return merged;
    })
        .then(function (result) {
        // we want to exclude the top-level project from being included
        var dir = result[Object.keys(result)[0]]['dir'];
        var topLevelProjectInfo = jetpack.read(path.join(dir, 'package.json'), 'json');
        var keys = Object.getOwnPropertyNames(result).filter(function (k) {
            return k !== topLevelProjectInfo.name + "@" + topLevelProjectInfo.version;
        });
        return bluebird.map(keys, function (key) {
            console.log('processing', key);
            var packageInfo = result[key];
            var defaultPackagePath = packageInfo['dir'] + "/node_modules/" + packageInfo.name + "/package.json";
            return jetpack
                .existsAsync(defaultPackagePath)
                .then(function (itemAtPath) {
                if (itemAtPath === 'file') {
                    return [defaultPackagePath];
                }
                else {
                    return jetpack.findAsync(packageInfo['dir'], {
                        matching: "**/node_modules/" + packageInfo.name + "/package.json"
                    });
                }
            })
                .then(function (packagePath) {
                if (packagePath && packagePath[0]) {
                    return jetpack.read(packagePath[0], 'json');
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
                    (packageInfo.author && getAttributionForAuthor(packageInfo.author)) ||
                        (packageInfo.contributors &&
                            packageInfo.contributors
                                .map(function (c) {
                                return getAttributionForAuthor(c);
                            })
                                .join(', ')) ||
                        (packageInfo.maintainers &&
                            packageInfo.maintainers
                                .map(function (m) {
                                return getAttributionForAuthor(m);
                            })
                                .join(', '));
                var licenseFile = packageInfo.licenseFile;
                if (licenseFile &&
                    jetpack.exists(licenseFile) &&
                    path.basename(licenseFile).match(/license/i)) {
                    props.licenseText = jetpack.read(licenseFile);
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
            concurrency: os.cpus().length
        });
    });
}
//# sourceMappingURL=npm.js.map