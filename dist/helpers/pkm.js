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
exports.install = exports.checkIfInstalled = void 0;
const child_process_promise_1 = require("child-process-promise");
const logging_1 = require("./logging");
function checkIfInstalled(app, pkm) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let command;
            switch (pkm) {
                case 'brew':
                    command = `brew list ${app}`;
                    break;
                case 'npm':
                    command = `npm list -g ${app}`;
                    break;
                case 'pnpm':
                    command = `pnpm list -g ${app}`;
                    break;
            }
            yield (0, child_process_promise_1.exec)(command);
        }
        catch (e) {
            console.log(e);
            (0, logging_1.cli_log)(`${app} is not installed via ${pkm}`);
            yield install(app, pkm);
        }
    });
}
exports.checkIfInstalled = checkIfInstalled;
function install(app, pkm) {
    return __awaiter(this, void 0, void 0, function* () {
        let command;
        switch (pkm) {
            case 'brew':
                command = `brew install ${app}`;
                break;
            case 'npm':
                command = `npm i -g ${app}`;
                break;
            case 'pnpm':
                command = `pnpm i -g ${app}`;
                break;
        }
        try {
            yield (0, child_process_promise_1.exec)(command);
            (0, logging_1.cli_success)(`${app} installed via ${pkm}`);
        }
        catch (e) {
            (0, logging_1.cli_error)(`Error installing ${app} via ${pkm}, please run manually with: ${command}`);
        }
    });
}
exports.install = install;
//# sourceMappingURL=pkm.js.map