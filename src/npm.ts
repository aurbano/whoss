import bluebird from 'bluebird'
import npmchecker from 'license-checker'
import path from 'path'
import jetpack from 'fs-jetpack'
import os from 'os'

import { getAttributionForAuthor } from './util'
import { Options } from './constants'

const licenseCheckerCustomFormat = {
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
}

export function getNpmLicenses(options: Options) {
  let npmDirs
  if (!Array.isArray(options.baseDir)) {
    npmDirs = [options.baseDir]
  } else {
    npmDirs = options.baseDir
  }
  // first - check that this is even an NPM project
  for (let i = 0; i < npmDirs.length; i++) {
    if (!jetpack.exists(path.join(npmDirs[i], 'package.json'))) {
      console.log(
        'directory at "' +
          npmDirs[i] +
          '" does not look like an NPM project, skipping NPM checks for path ' +
          npmDirs[i]
      )
      return []
    }
  }
  console.log('Looking at directories: ' + npmDirs)

  const checkers: Array<any> = []
  for (let i = 0; i < npmDirs.length; i++) {
    checkers.push(
      bluebird.fromCallback(cb => {
        const dir = npmDirs[i]
        return npmchecker.init(
          {
            start: npmDirs[i],
            production: true,
            customFormat: licenseCheckerCustomFormat
          },
          function(err, json) {
            if (err) {
              //Handle error
              console.error(err)
            } else {
              Object.getOwnPropertyNames(json).forEach(k => {
                json[k]['dir'] = dir
              })
            }
            cb(err, json)
          }
        )
      })
    )
  }
  if (checkers.length === 0) {
    return []
  }

  return bluebird
    .all(checkers)
    .then(raw_result => {
      // the result is passed in as an array, one element per npmDir passed in
      // de-dupe the entries and merge it into a single object
      let merged = {}
      for (let i = 0; i < raw_result.length; i++) {
        merged = Object.assign(raw_result[i], merged)
      }
      return merged
    })
    .then(result => {
      // we want to exclude the top-level project from being included
      const dir = result[Object.keys(result)[0]]['dir']
      const topLevelProjectInfo = jetpack.read(path.join(dir, 'package.json'), 'json')
      const keys = Object.getOwnPropertyNames(result).filter(k => {
        return k !== `${topLevelProjectInfo.name}@${topLevelProjectInfo.version}`
      })

      return bluebird.map(
        keys,
        key => {
          console.log('processing', key)

          const packageInfo = result[key]
          const defaultPackagePath = `${packageInfo['dir']}/node_modules/${
            packageInfo.name
          }/package.json`
          return jetpack
            .existsAsync(defaultPackagePath)
            .then(itemAtPath => {
              if (itemAtPath === 'file') {
                return [defaultPackagePath]
              } else {
                return jetpack.findAsync(packageInfo['dir'], {
                  matching: `**/node_modules/${packageInfo.name}/package.json`
                })
              }
            })
            .then(packagePath => {
              if (packagePath && packagePath[0]) {
                return jetpack.read(packagePath[0], 'json')
              } else {
                return Promise.reject(`${packageInfo.name}: unable to locate package.json`)
              }
            })
            .then(packageInfo => {
              console.log('Processing', packageInfo.name, 'for authors and licenseText')

              const props = {
                authors: [],
                licenseText: ''
              }

              props.authors =
                (packageInfo.author && getAttributionForAuthor(packageInfo.author)) ||
                (packageInfo.contributors &&
                  packageInfo.contributors
                    .map(c => {
                      return getAttributionForAuthor(c)
                    })
                    .join(', ')) ||
                (packageInfo.maintainers &&
                  packageInfo.maintainers
                    .map(m => {
                      return getAttributionForAuthor(m)
                    })
                    .join(', '))

              const licenseFile = packageInfo.licenseFile
              if (
                licenseFile &&
                jetpack.exists(licenseFile) &&
                path.basename(licenseFile).match(/license/i)
              ) {
                props.licenseText = jetpack.read(licenseFile)
              } else {
                props.licenseText = ''
              }

              return props
            })
            .catch(e => {
              console.warn(e)
              return {
                authors: '',
                licenseText: ''
              }
            })
            .then(derivedProps => {
              return {
                ignore: false,
                name: packageInfo.name,
                version: packageInfo.version,
                authors: derivedProps.authors,
                url: packageInfo.repository,
                license: packageInfo.licenses,
                licenseText: derivedProps.licenseText
              }
            })
        },
        {
          concurrency: os.cpus().length
        }
      )
    })
}
