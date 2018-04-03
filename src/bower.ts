import bluebird from 'bluebird'
import _ from 'lodash'
import bower from 'bower'
import path from 'path'
import jetpack from 'fs-jetpack'
import os from 'os'

import { getAttributionForAuthor } from './util'
import { Author, Options } from './constants'

/**
 * TL;DR - normalizing the output format for NPM & Bower license info
 *
 * The output from license-checker gives us what we need:
 *  - component name
 *  - version
 *  - authors (note: not returned by license-checker, we have to apply our heuristic)
 *  - url
 *  - license(s)
 *  - license contents OR license snippet (in case of license embedded in markdown)
 *
 * Where we calculate the license information manually for Bower components,
 * we'll return an object with these properties.
 */
export function getBowerLicenses(options: Options) {
  // first - check that this is even a bower project
  let baseDir
  if (Array.isArray(options.baseDir)) {
    baseDir = options.baseDir[0]
    if (options.baseDir.length > 1) {
      console.warn(
        'Checking multiple directories is not yet supported for Bower projects.\n' +
          'Checking only the first directory: ' +
          baseDir
      )
    }
  }
  if (!jetpack.exists(path.join(baseDir, 'bower.json'))) {
    console.log('this does not look like a Bower project, skipping Bower checks.')
    return []
  }

  bower.config.cwd = baseDir
  const bowerComponentsDir = path.join(bower.config.cwd, bower.config.directory)
  return jetpack.inspectTreeAsync(bowerComponentsDir, { relativePath: true }).then(result => {
    /**
     * for each component, try to calculate the license from the NPM package info
     * if it is a available because license-checker more closely aligns with our
     * objective.
     */
    return bluebird.map(
      result.children,
      (component: any) => {
        const absPath = path.join(bowerComponentsDir, component.relativePath)
        // npm license check didn't work
        // try to get the license and package info from .bower.json first
        // because it has more metadata than the plain bower.json
        return jetpack
          .readAsync(path.join(absPath, '.bower.json'), 'json')
          .catch(() => {
            return jetpack.readAsync(path.join(absPath, 'bower.json'), 'json')
          })
          .then(packageInfo => {
            console.log('processing', packageInfo.name)
            // assumptions here based on https://github.com/bower/spec/blob/master/json.md
            // extract necessary properties as described in TL;DR above
            const url =
              packageInfo['_source'] ||
              (packageInfo.repository && packageInfo.repository.url) ||
              packageInfo.url ||
              packageInfo.homepage

            let authors = ''
            if (packageInfo.authors) {
              authors = _.map(packageInfo.authors, (a: Author) => {
                return getAttributionForAuthor(a)
              }).join(', ')
            } else {
              // extrapolate author from url if it's a github repository
              const githubMatch = url.match(/github\.com\/.*\//)
              if (githubMatch) {
                authors = githubMatch[0].replace('github.com', '').replace(/\//g, '')
              }
            }

            // normalize the license object
            packageInfo.license = packageInfo.license || packageInfo.licenses
            const licenses =
              packageInfo.license && _.isString(packageInfo.license)
                ? packageInfo.license
                : _.isArray(packageInfo.license)
                  ? packageInfo.license.join(',')
                  : packageInfo.licenses

            // find the license file if it exists
            const licensePath = _.find(component.children, c => {
              return /licen[cs]e/i.test(c.name)
            })
            let licenseText = null
            if (licensePath) {
              licenseText = jetpack.read(path.join(bowerComponentsDir, licensePath.relativePath))
            }

            return {
              ignore: false,
              name: packageInfo.name,
              version: packageInfo.version || packageInfo['_release'],
              authors: authors,
              url: url,
              license: licenses,
              licenseText: licenseText
            }
          })
      },
      {
        concurrency: os.cpus().length
      }
    )
  })
}
