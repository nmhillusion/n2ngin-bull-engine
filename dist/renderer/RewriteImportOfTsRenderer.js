"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewriteImportOfTsRenderer = void 0;
const fs = require("fs");
const Renderable_1 = require("./Renderable");
class RewriteImportOfTsRenderer extends Renderable_1.Renderable {
    constructor() {
        super(...arguments);
        this.IMPORT_MODULE_PATTERN = /import(?:.*?)from\s*(?:'|")(.+?)(?:'|")\s*;?/gi;
    }
    doRender(filePath, rootDir, outDir) {
        if (filePath.endsWith(".js")) {
            console.log("[rewriteImport] render: ", filePath);
            this.jsRewriteImportFile(filePath);
        }
    }
    jsRewriteImportFile(path = "") {
        if (path.endsWith(".js")) {
            console.log("rewriting for ", path);
            let fileContent = fs.readFileSync(path).toString();
            const matchArray = fileContent.matchAll(this.IMPORT_MODULE_PATTERN);
            for (const matching of matchArray) {
                const [matchedString, groupMatch] = matching;
                const convertedString = matchedString.replace(groupMatch, `${groupMatch}.js`);
                fileContent = fileContent.replace(matchedString, convertedString);
                // logger.log({ matchedString, groupMatch, fileContent });
            }
            fs.writeFileSync(path, fileContent);
        }
    }
}
exports.RewriteImportOfTsRenderer = RewriteImportOfTsRenderer;
//# sourceMappingURL=RewriteImportOfTsRenderer.js.map