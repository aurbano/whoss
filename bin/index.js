#!/usr/bin/env node

// usage
var yargs = require('yargs')
  .usage('Calculate the npm and bower modules used in this project and generate a third-party attribution (credits) text.',
    {
      outputDir: {
        alias: 'o',
        default: './whoss'
      },
      baseDir: {
        alias: 'b',
        default: process.cwd(),
      }
    })
  .array('baseDir')
  .example('$0 -o ./tpn', 'run the tool and output text and backing json to ${projectRoot}/tpn directory.')
  .example('$0 -b ./some/path/to/projectDir', 'run the tool for NPM/Bower projects in another directory.')
  .example('$0 -o tpn -b ./some/path/to/projectDir', 'run the tool in some other directory and dump the output in a directory called "tpn" there.');

if (yargs.argv.help) {
  yargs.showHelp();
  process.exit(1);
}

var whoss = require('../src/index');