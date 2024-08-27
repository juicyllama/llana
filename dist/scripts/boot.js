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
exports.boot = void 0;
const pkm_1 = require("../helpers/pkm");
function boot() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, pkm_1.checkIfInstalled)('jq', 'brew');
        yield (0, pkm_1.checkIfInstalled)('mkcert', 'brew');
        yield (0, pkm_1.checkIfInstalled)('pnpm', 'npm');
        yield (0, pkm_1.checkIfInstalled)('npx', 'pnpm');
        yield (0, pkm_1.checkIfInstalled)('ts-node', 'pnpm');
    });
}
exports.boot = boot;
//# sourceMappingURL=boot.js.map