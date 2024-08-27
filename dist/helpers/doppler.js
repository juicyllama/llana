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
exports.setupDoppler = void 0;
const files_1 = require("./files");
const logging_1 = require("./logging");
const child_process_1 = require("child_process");
function login(project) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, child_process_1.exec)(`doppler login --debug`, (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout:\n${stdout}`);
        });
        (0, child_process_1.exec)(`doppler setup --no-interactive -p ${project.doppler.project} -c ${project.doppler.config}`, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            console.log(error, stdout, stderr);
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr}`);
                return false;
            }
            console.log(stdout);
        }));
        return true;
    });
}
function sync() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, child_process_1.exec)(`doppler secrets --json > secrets.json`, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr}`);
            }
        }));
        (0, child_process_1.exec)(`jq -r 'to_entries|map("\\(.key)=\\(.value.computed|tostring)")|.[]' secrets.json > .env`, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr}`);
            }
        }));
        (0, child_process_1.exec)(`rm -rf secrets.json`, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr}`);
            }
        }));
        (0, child_process_1.exec)(`export $(grep -v '^#' .env)`, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr}`);
            }
        }));
        (0, logging_1.cli_log)('Secrets Installed');
    });
}
function setupDoppler(project) {
    return __awaiter(this, void 0, void 0, function* () {
        let authed = false;
        if (!(0, files_1.fileExists)((0, files_1.currentPath)() + '.env')) {
            (0, logging_1.cli_log)(`Login to Doppler for fetching .env secrets`);
            authed = yield login(project);
        }
        if (!authed) {
            (0, logging_1.cli_error)(`Doppler authentication failed`);
            return;
        }
        yield sync();
    });
}
exports.setupDoppler = setupDoppler;
//# sourceMappingURL=doppler.js.map