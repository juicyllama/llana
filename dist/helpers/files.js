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
exports.writeToFile = exports.fileExists = exports.currentPath = exports.File = void 0;
const child_process_1 = require("child_process");
const logging_1 = require("./logging");
const fs_1 = __importDefault(require("fs"));
var File;
(function (File) {
    File["HOSTS"] = "/etc/hosts";
})(File || (exports.File = File = {}));
const currentPath = () => process.cwd();
exports.currentPath = currentPath;
function fileExists(location) {
    return fs_1.default.existsSync(location);
}
exports.fileExists = fileExists;
function writeToFile(file, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const command = `echo ${content} | sudo tee -a ${file} >/dev/null`;
        (0, child_process_1.exec)(command, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (error) {
                (0, logging_1.cli_error)(`error: ${stderr} (${stdout})`);
                return;
            }
        }));
        return;
    });
}
exports.writeToFile = writeToFile;
//# sourceMappingURL=files.js.map