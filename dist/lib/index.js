import bluebird from 'bluebird';
import _ from 'lodash';
import path from 'path';
import jetpack from 'fs-jetpack';
import os from 'os';
import taim from 'taim';
import { DEFAULT_SEPARATOR } from './constants';
import { getNpmLicenses } from './npm';
import { getBowerLicenses } from './bower';
/**
 * whoss
 *
 * Utility to parse npm and bower packages used in a project and generate an attribution file to include in your product.
 *
 */
export default function whoss(options) {
    taim('Total Processing', bluebird.all([
        taim('Npm Licenses', getNpmLicenses(options)),
        taim('Bower Licenses', getBowerLicenses(options))
    ]))
        .catch(function (err) {
        console.log(err);
        process.exit(1);
    })
        .spread(function (npmOutput, bowerOutput) {
        var o = {};
        npmOutput = npmOutput || {};
        bowerOutput = bowerOutput || {};
        _.concat(npmOutput, bowerOutput).forEach(function (v) {
            o[v.name] = v;
        });
        var userOverridesPath = path.join(options.outputDir, 'overrides.json');
        if (jetpack.exists(userOverridesPath)) {
            var userOverrides = jetpack.read(userOverridesPath, 'json');
            console.log('Using overrides:', userOverrides);
            // foreach override, loop through the properties and assign them to the base object.
            o = _.defaultsDeep(userOverrides, o);
        }
        return o;
    })
        .catch(function (e) {
        console.error('ERROR processing overrides', e);
        process.exit(1);
    })
        .then(function (licenseInfos) {
        var attributionSequence = _(licenseInfos)
            .filter(function (licenseInfo) { return licenseInfo && !licenseInfo.ignore && licenseInfo.name !== undefined; })
            .sortBy(function (licenseInfo) { return licenseInfo.name.toLowerCase(); })
            .map(function (licenseInfo) {
            return [
                licenseInfo.name,
                licenseInfo.version + " <" + licenseInfo.url + ">",
                licenseInfo.licenseText ||
                    "license: " + licenseInfo.license + os.EOL + "authors: " + licenseInfo.authors
            ].join(os.EOL);
        })
            .value();
        var attribution = attributionSequence.join(DEFAULT_SEPARATOR);
        var headerPath = path.join(options.outputDir, 'header.txt');
        if (jetpack.exists(headerPath)) {
            var template = jetpack.read(headerPath);
            console.log('using template', template);
            attribution = template + os.EOL + os.EOL + attribution;
        }
        jetpack.write(path.join(options.outputDir, 'licenseInfos.json'), JSON.stringify(licenseInfos));
        return jetpack.write(path.join(options.outputDir, 'attribution.txt'), attribution);
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
//# sourceMappingURL=index.js.map