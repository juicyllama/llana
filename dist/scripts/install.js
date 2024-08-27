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
exports.install = void 0;
const logging_1 = require("../helpers/logging");
const ssl_1 = require("../helpers/ssl");
const docker_1 = require("../helpers/docker");
const fs_1 = __importDefault(require("fs"));
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        const json = JSON.parse(fs_1.default.readFileSync('package.json', 'utf-8'));
        const project = json.llana;
        if (project.apps) {
            (0, logging_1.cli_log)(`Found ${project.apps.length} apps in package.json`);
            for (const app of project.apps) {
                if (app.domain) {
                    if (app.ssl) {
                        yield (0, ssl_1.setupSSL)(app);
                    }
                }
            }
        }
        if (project.doppler) {
            (0, logging_1.cli_error)(`Doppler needs to be run manually for now`);
        }
        if (project.docker) {
            yield (0, docker_1.setupDocker)(project);
        }
        (0, logging_1.cli_log)(`Install complete!`);
    });
}
exports.install = install;
//# sourceMappingURL=install.js.map