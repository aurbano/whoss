# whoss
> Utility to parse npm and bower packages used in a project and generate an attribution file to include in your product.

[![Travis](https://img.shields.io/travis/aurbano/whoss.svg)](https://travis-ci.org/aurbano/whoss)
[![npm](https://img.shields.io/npm/v/whoss.svg)](https://www.npmjs.com/package/whoss)
[![Coverage Status](https://coveralls.io/repos/github/aurbano/whoss/badge.svg?branch=master)](https://coveralls.io/github/aurbano/whoss?branch=master)
[![npm](https://img.shields.io/npm/dm/whoss.svg)](https://www.npmjs.com/package/whoss)
[![npm](https://img.shields.io/npm/l/whoss.svg)](https://www.npmjs.com/package/whoss)
[![Codacy grade](https://img.shields.io/codacy/grade/e2589a609bdc4c56bd49c232a65dab4e.svg)](https://www.codacy.com/app/aurbano/whoss)

## Installation

Local installation:

```
npm i whoss
```
or
```
yarn add whoss
```


Global installation:

```
npm i -g whoss
```
or
```
yarn global add whoss
```

## Usage

### For a single Bower or Node project
```
cd pathToYourProject
whoss
git add ./oss-attribution
git commit -m 'adding open source attribution output from whoss'
```

### Help

Use the `--help` argument to get further usage details about the various program arguments:

```
whoss --help
```

### Understanding the "overrides"

#### Ignoring a package
Sometimes, you may have an "internal" module which you/your team developed, or a module where you've arranged a special license with the owner. These wouldn't belong in your license attributions, so you can ignore them by creating an `overrides.json` file like so:
```
{
  "signaling-agent": {
      "ignore": true 
  }
}
```

#### Changing the properties of package in the attribution file only
Other times, you may need to supply your own text for the purpose of the attribution/credits. You have full control of this in the `overrides.json` file as well:
```
{
  "some-package": {
    "name": "some-other-package-name",
    "version": "1.0.0-someotherversion",
    "authors": "some person",
    "url": "https://thatwebsite.com/since/their/original/link/was/broken",
    "license": "MIT",
    "licenseText": "you can even override the license text in case the original contents of the LICENSE file were wrong for some reason"
  }
}
```

## Running on CI
For a large project with multiple maintainers you will probably want to run this on your CI build server, so that the attributions are always up to date.

## Prior art
Like most software, this component is built on the shoulders of giants; `whoss` was inspired in part by the following work:

  - [oss-attribution-generator](https://github.com/zumwald/oss-attribution-generator)
  - [license-checker](https://github.com/davglass/license-checker)
  - [tldrlegal](https://github.com/eladnava/tldrlegal)
