"use strict";
exports.__esModule = true;
exports.formatTitleCaseToKebabCase = void 0;
var formatTitleCaseToKebabCase = function (str) {
    return str.toLowerCase().replace(/\s/g, "-");
};
exports.formatTitleCaseToKebabCase = formatTitleCaseToKebabCase;
