import { Options } from './constants';
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
export declare function getBowerLicenses(options: Options): any;
