import * as fs from "fs";
import { TraversalWorkspace } from "../core/TraversalWorkspace";
import { Renderable } from "./Renderable";

export class RewriteImportOfTsRenderer extends Renderable {
  private readonly IMPORT_MODULE_PATTERN: RegExp =
    /import(?:.*?)from\s*(?:'|")(.+?)(?:'|")\s*;?/gi;

    constructor(traversaller: TraversalWorkspace) {
      super(traversaller, "RewriteImportOfTsRenderer");
    }

  protected doRender(filePath: string, rootDir: string, outDir: string) {
    if (filePath.endsWith(".js")) {
      console.log("[rewriteImport] render: ", filePath);

      this.jsRewriteImportFile(filePath);
    }
  }

  private jsRewriteImportFile(path = "") {
    if (path.endsWith(".js")) {
      this.logger.info(path);

      let fileContent = fs.readFileSync(path).toString();

      const matchArray = fileContent.matchAll(this.IMPORT_MODULE_PATTERN);
      for (const matching of matchArray) {
        const [matchedString, groupMatch] = matching;
        const convertedString = matchedString.replace(
          groupMatch,
          `${groupMatch}.js`
        );

        fileContent = fileContent.replace(matchedString, convertedString);

        // logger.log({ matchedString, groupMatch, fileContent });
      }

      fs.writeFileSync(path, fileContent);
    }
  }
}
