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
exports.setupDocker = void 0;
const child_process_promise_1 = require("child-process-promise");
const logging_1 = require("./logging");
function setupDocker(project) {
    return __awaiter(this, void 0, void 0, function* () {
        let docker_name = project.project_name;
        if (typeof project.docker === 'string') {
            docker_name = project.docker;
        }
        (0, logging_1.cli_log)(`Building Docker ${docker_name}...`);
        try {
            const command1 = `docker kill $(docker ps -q) 2>/dev/null`;
            yield (0, child_process_promise_1.exec)(command1);
        }
        catch (e) {
        }
        try {
            const command2 = `docker compose --project-name ${docker_name} up --build --detach`;
            yield (0, child_process_promise_1.exec)(command2);
            (0, logging_1.cli_log)(`Docker ${docker_name} built!`);
        }
        catch (e) {
            (0, logging_1.cli_error)(`error: ${e}`);
            return;
        }
    });
}
exports.setupDocker = setupDocker;
//# sourceMappingURL=docker.js.map