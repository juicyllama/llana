"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli_success = exports.cli_error = exports.cli_log = void 0;
const simple_output_1 = __importDefault(require("simple-output"));
function cli_log(message) {
    simple_output_1.default.node(`🦙 \x1B[1;33m${message}\x1B[0m`);
}
exports.cli_log = cli_log;
function cli_error(message) {
    simple_output_1.default.node(`🦙 \x1B[0;31m${message}\x1B[0m`);
}
exports.cli_error = cli_error;
function cli_success(message) {
    simple_output_1.default.node(`🦙 \x1B[0;32m${message}\x1B[0m`);
}
exports.cli_success = cli_success;
//# sourceMappingURL=logging.js.map