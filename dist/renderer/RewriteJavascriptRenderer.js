"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewriteJavascriptRenderer = void 0;
const fs = require("fs");
const Renderable_1 = require("./Renderable");
class RewriteJavascriptRenderer extends Renderable_1.Renderable {
    constructor() {
        super(...arguments);
        this.IMPORT_MODULE_PATTERN = /import(?:.*?)from\s*(?:'|")(.+?)(?:'|")\s*;?/gi;
    }
    doRender(filePath, rootDir, outDir, renderConfig) {
        if (filePath.endsWith(".js")) {
            this.jsRewriteImportFile(filePath, renderConfig);
        }
    }
    jsRewriteImportFile(path = "", renderConfig) {
        var _a, _b, _c, _d;
        this.logger.info(path);
        let fileContent = fs.readFileSync(path).toString();
        console.log("file content 0: ", { fileContent });
        {
            const willRewriteImport = (_b = (_a = renderConfig.rewriteJavascript) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.rewriteImport;
            if (undefined == willRewriteImport || willRewriteImport) {
                this.logger.info("[rewriteImport] render: ", path);
                const matchArray = fileContent.matchAll(this.IMPORT_MODULE_PATTERN);
                for (const matching of matchArray) {
                    const [matchedString, groupMatch] = matching;
                    const convertedString = matchedString.replace(groupMatch, `${groupMatch}.js`);
                    console.log({ matchedString, groupMatch, convertedString });
                    fileContent = fileContent.replace(matchedString, convertedString);
                }
            }
        }
        console.log("file content 1: ", { fileContent });
        if ((_d = (_c = renderConfig.rewriteJavascript) === null || _c === void 0 ? void 0 : _c.config) === null || _d === void 0 ? void 0 : _d.compress) {
            // this.logger.info("[rewriteCompress] render: ", path);
            // const { code, error } = uglify.minify(fileContent, {
            //   compress: {
            //     passes: 2,
            //   },
            //   output: {
            //     beautify: false,
            //   },
            // });
            // if (error) {
            //   this.logger.error(" error when uglify: ", error);
            // } else {
            //   fileContent = code;
            // }
        }
        console.log("file content 2: ", { fileContent });
        fs.writeFile(path, fileContent, "utf-8", (err) => {
            if (err) {
                this.logger.error("error saving: ", err);
            }
        });
    }
}
exports.RewriteJavascriptRenderer = RewriteJavascriptRenderer;
//# sourceMappingURL=RewriteJavascriptRenderer.js.map