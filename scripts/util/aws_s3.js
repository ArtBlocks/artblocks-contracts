"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.createBucket = exports.createPBABBuckets = void 0;
var format_1 = require("./format");
var _a = require("@aws-sdk/client-s3"), S3Client = _a.S3Client, CreateBucketCommand = _a.CreateBucketCommand;
var s3Client = new S3Client({ region: "us-east-1" });
var createBucket = function (client, bucketName) { return __awaiter(void 0, void 0, void 0, function () {
    var input, command;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = {
                    Bucket: bucketName
                };
                command = new CreateBucketCommand(input);
                return [4 /*yield*/, client.send(command)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.createBucket = createBucket;
var createPBABBuckets = function (client, pbabTokenName) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, key, stagingBucketName, stagingBucketResponse, prodBucketName, prodBucketResponse;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                payload = {};
                key = (0, format_1.formatTitleCaseToKebabCase)(pbabTokenName);
                if (client === undefined) {
                    client = s3Client;
                }
                stagingBucketName = "".concat(key, "-staging");
                return [4 /*yield*/, createBucket(s3Client, stagingBucketName)];
            case 1:
                stagingBucketResponse = _a.sent();
                payload["staging"] = stagingBucketResponse;
                console.log("Created s3 bucket for ".concat(stagingBucketName));
                prodBucketName = "".concat(key, "-mainnet");
                return [4 /*yield*/, createBucket(s3Client, prodBucketName)];
            case 2:
                prodBucketResponse = _a.sent();
                payload["production"] = prodBucketResponse;
                console.log("Created s3 bucket for ".concat(prodBucketName));
                return [2 /*return*/, payload];
        }
    });
}); };
exports.createPBABBuckets = createPBABBuckets;
