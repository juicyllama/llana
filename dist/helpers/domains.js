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
exports.setupDomain = void 0;
const child_process_promise_1 = require("child-process-promise");
const logging_1 = require("./logging");
const files_1 = require("./files");
function writeDomain(domain) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, logging_1.cli_log)(`Installing ${domain} into hosts file`);
        yield (0, files_1.writeToFile)(files_1.File.HOSTS, `127.0.0.1 ${domain}`);
        yield (0, files_1.writeToFile)(files_1.File.HOSTS, `::1 ${domain}`);
    });
}
function setupDomain(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const command = `ping -c 1 "${app.domain}"`;
        let result;
        try {
            result = yield (0, child_process_promise_1.exec)(command);
        }
        catch (e) {
            yield writeDomain(app.domain);
            return;
        }
        if (result.error) {
            yield writeDomain(app.domain);
            return;
        }
        if (result.stderr.startsWith('PING')) {
            yield writeDomain(app.domain);
            return;
        }
        if (result.stdout.startsWith('PING')) {
            return;
        }
        else {
            yield writeDomain(app.domain);
            return;
        }
    });
}
exports.setupDomain = setupDomain;
//# sourceMappingURL=domains.js.map