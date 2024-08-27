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
exports.setupSSL = void 0;
const path_1 = __importDefault(require("path"));
const child_process_promise_1 = require("child-process-promise");
const logging_1 = require("./logging");
const files_1 = require("./files");
function createSSL(app) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, logging_1.cli_log)(`Creating SSL certificate for ${app.domain}`);
        const command = [
            'current_dir=$PWD',
            `cd $PWD/${app.ssl}`,
            `mkcert ${app.domain}`,
            'cd $current_dir',
        ].join('; ');
        try {
            yield (0, child_process_promise_1.exec)(command);
            (0, logging_1.cli_log)(`SSL certificate created for ${app.domain}`);
        }
        catch (e) {
            (0, logging_1.cli_error)(`SSL certificate for ${app.domain} not created. Error: ${e.message}`);
        }
    });
}
function setupSSL(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = path_1.default.join((0, files_1.currentPath)(), app.ssl, `${app.domain}-key.pem`);
        if (!(0, files_1.fileExists)(file)) {
            yield createSSL(app);
        }
    });
}
exports.setupSSL = setupSSL;
//# sourceMappingURL=ssl.js.map