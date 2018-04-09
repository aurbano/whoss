import bluebird from 'bluebird'
import _ from 'lodash'
import path from 'path'
import jetpack from 'fs-jetpack'
import os from 'os'
import taim from 'taim'

import { Options, DEFAULT_SEPARATOR } from './constants'
import { getNpmLicenses } from './npm'
import { getBowerLicenses } from './bower'

/**
 * whoss
 *
 * Utility to parse npm and bower packages used in a project and generate an attribution file to include in your product.
 *
 */
export default function whoss(options: Options) {
  taim(
    'Total Processing',
    bluebird.all([
      taim('Npm Licenses', getNpmLicenses(options)),
      taim('Bower Licenses', getBowerLicenses(options))
    ])
  )
    .catch(err => {
      console.log(err)
      process.exit(1)
    })
    .spread((npmOutput, bowerOutput) => {
      let o = {}
      npmOutput = npmOutput || {}
      bowerOutput = bowerOutput || {}
      _.concat(npmOutput, bowerOutput).forEach(v => {
        o[v.name] = v
      })

      const userOverridesPath = path.join(options.outputDir, 'overrides.json')
      if (jetpack.exists(userOverridesPath)) {
        const userOverrides = jetpack.read(userOverridesPath, 'json')
        console.log('Using overrides:', userOverrides)
        // foreach override, loop through the properties and assign them to the base object.
        o = _.defaultsDeep(userOverrides, o)
      }

      return o
    })
    .catch(e => {
      console.error('ERROR processing overrides', e)
      process.exit(1)
    })
    .then((licenseInfos: any) => {
      const attributionSequence = _(licenseInfos)
        .filter(
          (licenseInfo: any) => licenseInfo && !licenseInfo.ignore && licenseInfo.name !== undefined
        )
        .sortBy(licenseInfo => licenseInfo.name.toLowerCase())
        .map((licenseInfo: any) => {
          return [
            licenseInfo.name,
            `${licenseInfo.version} <${licenseInfo.url}>`,
            licenseInfo.licenseText ||
              `license: ${licenseInfo.license}${os.EOL}authors: ${licenseInfo.authors}`
          ].join(os.EOL)
        })
        .value()

      let attribution = attributionSequence.join(DEFAULT_SEPARATOR)

      const headerPath = path.join(options.outputDir, 'header.txt')

      if (jetpack.exists(headerPath)) {
        const template = jetpack.read(headerPath)
        console.log('using template', template)
        attribution = template + os.EOL + os.EOL + attribution
      }

      jetpack.write(path.join(options.outputDir, 'licenseInfos.json'), JSON.stringify(licenseInfos))

      return jetpack.write(path.join(options.outputDir, 'attribution.txt'), attribution)
    })
    .catch(e => {
      console.error('ERROR writing attribution file', e)
      process.exit(1)
    })
    .then(() => {
      console.log('done')
      process.exit()
    })
}
