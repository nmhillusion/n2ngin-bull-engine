"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptRenderer = void 0;
const fs = require("fs");
const shelljs = require("shelljs");
const Renderable_1 = require("./Renderable");
const index_1 = require("../index");
class TypeScriptRenderer extends Renderable_1.Renderable {
    constructor() {
        super(...arguments);
        this.userTsConfigPath = index_1.WORKSPACE_DIR + "/user.tsconfig.json";
        this.userBaseTsConfigPath = index_1.WORKSPACE_DIR + "/user.base.tsconfig.json";
    }
    readUserTsConfigFile() {
        return fs.readFileSync(this.userBaseTsConfigPath).toString();
    }
    writeUserTsConfigFile(data) {
        fs.writeFileSync(this.userTsConfigPath, data);
    }
    doRender(filePath, rootDir, outDir, renderConfig) {
        var _a, _b;
        if (filePath.endsWith(".ts")) {
            console.log("[typescript] render: ", filePath);
            const tsConfig = JSON.parse(this.readUserTsConfigFile());
            tsConfig.files = [filePath];
            tsConfig.compilerOptions.rootDir = rootDir;
            tsConfig.compilerOptions.outDir = outDir;
            if ((_a = renderConfig === null || renderConfig === void 0 ? void 0 : renderConfig.typescript) === null || _a === void 0 ? void 0 : _a.config) {
                Object.assign(tsConfig, (_b = renderConfig === null || renderConfig === void 0 ? void 0 : renderConfig.typescript) === null || _b === void 0 ? void 0 : _b.config);
            }
            this.writeUserTsConfigFile(JSON.stringify(tsConfig));
            shelljs.exec(`npx tsc --project ${index_1.WORKSPACE_DIR}/user.tsconfig.json`);
        }
    }
}
exports.TypeScriptRenderer = TypeScriptRenderer;
//# sourceMappingURL=TypeScriptRenderer.js.map