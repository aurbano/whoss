import isString from 'lodash/isString';
export function getAttributionForAuthor(a) {
    return isString(a)
        ? a
        : a.name + (a.email || a.homepage || a.url ? " <" + (a.email || a.homepage || a.url) + ">" : '');
}
//# sourceMappingURL=util.js.map