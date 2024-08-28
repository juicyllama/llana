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
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = void 0;
const logging_1 = require("../helpers/utils/logging");
const nestjs_1 = require("../helpers/install/nestjs");
const llana_1 = require("../helpers/install/llana");
const configure_1 = require("../helpers/install/configure");
const code_1 = require("../helpers/app/code");
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, logging_1.cli_log)(`Installing NestJS`);
        yield (0, nestjs_1.installNestJs)();
        (0, logging_1.cli_log)(`Llana CLI`);
        yield (0, llana_1.installLlana)();
        (0, logging_1.cli_log)(`Setup Application Code`);
        yield (0, code_1.setupFiles)();
        (0, logging_1.cli_log)(`Configure Application`);
        yield (0, configure_1.configDatabase)();
        (0, logging_1.cli_log)(`Installation complete!`);
        process.exit(0);
    });
}
exports.install = install;
//# sourceMappingURL=install.js.map