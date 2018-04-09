"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bluebird_1 = require("bluebird");
var lodash_1 = require("lodash");
var path_1 = require("path");
var fs_jetpack_1 = require("fs-jetpack");
var os_1 = require("os");
var taim_1 = require("taim");
var constants_1 = require("./constants");
var npm_1 = require("./npm");
/**
 * whoss
 *
 * Utility to parse npm packages used in a project and generate an attribution file to include in your product.
 *
 */
function whoss(options) {
    taim_1.default('Total Processing', bluebird_1.default.all([
        taim_1.default('Npm Licenses', npm_1.getNpmLicenses(options)),
    ]))
        .catch(function (err) {
        console.log(err);
        process.exit(1);
    })
        .spread(function (npmOutput) {
        var o = {};
        npmOutput = npmOutput || {};
        lodash_1.default.concat(npmOutput).forEach(function (v) {
            o[v.name] = v;
        });
        var userOverridesPath = path_1.default.join(options.outputDir, 'overrides.json');
        if (fs_jetpack_1.default.exists(userOverridesPath)) {
            var userOverrides = fs_jetpack_1.default.read(userOverridesPath, 'json');
            console.log('Using overrides:', userOverrides);
            // foreach override, loop through the properties and assign them to the base object.
            o = lodash_1.default.defaultsDeep(userOverrides, o);
        }
        return o;
    })
        .catch(function (e) {
        console.error('ERROR processing overrides', e);
        process.exit(1);
    })
        .then(function (licenseInfos) {
        var attributionSequence = lodash_1.default(licenseInfos)
            .filter(function (licenseInfo) { return licenseInfo && !licenseInfo.ignore && licenseInfo.name !== undefined; })
            .sortBy(function (licenseInfo) { return licenseInfo.name.toLowerCase(); })
            .map(function (licenseInfo) {
            return [
                licenseInfo.name,
                licenseInfo.version + " <" + licenseInfo.url + ">",
                licenseInfo.licenseText ||
                    "license: " + licenseInfo.license + os_1.default.EOL + "authors: " + licenseInfo.authors
            ].join(os_1.default.EOL);
        })
            .value();
        var attribution = attributionSequence.join(constants_1.DEFAULT_SEPARATOR);
        var headerPath = path_1.default.join(options.outputDir, 'header.txt');
        if (fs_jetpack_1.default.exists(headerPath)) {
            var template = fs_jetpack_1.default.read(headerPath);
            console.log('using template', template);
            attribution = template + os_1.default.EOL + os_1.default.EOL + attribution;
        }
        fs_jetpack_1.default.write(path_1.default.join(options.outputDir, 'licenseInfos.json'), JSON.stringify(licenseInfos));
        return fs_jetpack_1.default.write(path_1.default.join(options.outputDir, 'attribution.txt'), attribution);
    })
        .catch(function (e) {
        console.error('ERROR writing attribution file', e);
        process.exit(1);
    })
        .then(function () {
        console.log('done');
        process.exit();
    });
}
exports.default = whoss;
//# sourceMappingURL=index.js.map