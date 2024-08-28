#!/usr/bin/env ts-node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const yargs_1 = __importDefault(require("yargs"));
const ipt_1 = __importDefault(require("ipt"));
const package_json_1 = require("./package.json");
const logging_1 = require("./helpers/utils/logging");
const scripts_enums_1 = require("./enums/scripts.enums");
const install_1 = require("./scripts/install");
const boot_1 = require("./scripts/boot");
const sync_1 = require("./scripts/sync");
const sep = os_1.default.EOL;
function getMainArgs() {
    let i = -1;
    const result = [];
    const mainArgs = process.argv.slice(2);
    while (++i < mainArgs.length) {
        if (mainArgs[i] === '--')
            break;
        result.push(mainArgs[i]);
    }
    return result;
}
function runScript(script) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (script) {
            case scripts_enums_1.Script.boot:
                yield (0, boot_1.boot)();
                break;
            case scripts_enums_1.Script.install:
                yield (0, install_1.install)();
                break;
            case scripts_enums_1.Script.sync:
                yield (0, sync_1.sync)();
                break;
            default:
                (0, logging_1.cli_error)(`Script ${script} not implemented`);
                process.exit(0);
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, logging_1.cli_log)(`Llana Cli v${package_json_1.version}`);
        const { argv } = (0, yargs_1.default)(getMainArgs());
        if (argv['_'].length > 0) {
            yield runScript(scripts_enums_1.Script[argv['_'][0]]);
        }
        else {
            (0, ipt_1.default)(Object.values(scripts_enums_1.Script), {
                message: 'Select a script to run',
                separator: sep,
            })
                .then((keys) => __awaiter(this, void 0, void 0, function* () {
                yield runScript(keys[0]);
            }))
                .catch(() => {
                (0, logging_1.cli_error)(`Error building interactive interface`);
                process.exit(0);
            });
        }
    });
}
run();
//# sourceMappingURL=cli.js.map