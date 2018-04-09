"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var isString_1 = require("lodash/isString");
function getAttributionForAuthor(a) {
    return isString_1.default(a)
        ? a
        : a.name + (a.email || a.homepage || a.url ? " <" + (a.email || a.homepage || a.url) + ">" : '');
}
exports.getAttributionForAuthor = getAttributionForAuthor;
//# sourceMappingURL=util.js.map