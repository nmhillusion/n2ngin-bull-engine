import * as fs from "fs";
import hljs from "highlight.js";
import * as markdownit from "markdown-it";
import * as path from "path";
import * as pug from "pug";
import { WORKSPACE_DIR } from "../..";
import { BullEngineState } from "../../core";
import { TraversalWorkspace } from "../../core/TraversalWorkspace";
import { FileSystemHelper } from "../../helper/FileSystemHelper";
import { RenderConfig } from "../../model";
import { Renderable } from "../Renderable";
import { PugRenderHelper } from "../../helper/PugRenderHelper";

export interface MarkdownMetadata {
  layoutPath: string;
  title: string;
  bannerLink: string;
  variables: { [key: string]: string };
}

export class MarkdownRenderer extends Renderable {
  private readonly HIGHLIGHT_CSS_FILE_NAME = "markdown.highlight.css";

  private readonly USING_HIGHLIGHT_JS_STORE: Set<string> = new Set<string>();

  private defaultStylePath = path.join(
    WORKSPACE_DIR,
    "/resources/DefaultCSS_Markdown.css"
  );
  private selfConfig_: markdownit.Options = {};

  constructor(
    traversal: TraversalWorkspace,
    engineState: BullEngineState,
    renderConfig: RenderConfig
  ) {
    super(traversal, engineState, renderConfig);
  }

  protected setupSelfConfig(): void {
    this.selfConfig_ = Object.assign(
      {},
      {
        html: true,
        linkify: true,
        typographer: true,
        langPrefix: "language-",
        breaks: true,
        xhtmlOut: true,
      },
      this.renderConfig.markdown.config || {}
    );
  }

  private prepareDefaultMarkdownStyleFile(
    filePath: string,
    rootDir: string,
    outDir: string,
    renderConfig: RenderConfig
  ) {
    this.logger.info("default css path: ", this.defaultStylePath);

    const cssTargetFilePath = path.join(
      path.dirname(filePath),
      path.basename(this.defaultStylePath)
    );

    if (!fs.existsSync(cssTargetFilePath)) {
      if (fs.existsSync(this.defaultStylePath)) {
        const highlightCss = fs.readFileSync(this.defaultStylePath).toString();

        FileSystemHelper.writeOutFile({
          data: highlightCss,
          outDir,
          rootDir,
          sourceFilePath: cssTargetFilePath,
          outExtension: ".css",
        });

        this.logger.info(`saved ${cssTargetFilePath}`);
      }
    }

    return {
      cssFilePath: path.relative(path.dirname(filePath), cssTargetFilePath),
      styleName: path.basename(cssTargetFilePath),
    };
  }

  private prepareHighlightCssFile(
    filePath: string,
    rootDir: string,
    outDir: string,
    renderConfig: RenderConfig
  ) {
    const highlightCssTargetFilePath = path.join(
      path.dirname(filePath),
      this.HIGHLIGHT_CSS_FILE_NAME
    );

    const highlightStyleName =
      renderConfig.markdown?.highlightStyleName ?? "github";

    if (!fs.existsSync(highlightCssTargetFilePath)) {
      const highlightCssPath = path.resolve(
        `node_modules/highlight.js/styles/${highlightStyleName}.min.css`
      );

      if (fs.existsSync(highlightCssPath)) {
        const highlightCss = fs.readFileSync(highlightCssPath).toString();

        FileSystemHelper.writeOutFile({
          data: highlightCss,
          outDir,
          rootDir,
          sourceFilePath: highlightCssTargetFilePath,
          outExtension: ".css",
        });

        this.logger.info(`saved ${this.HIGHLIGHT_CSS_FILE_NAME}`);
      }
    }

    return {
      cssFilePath: path.relative(
        path.dirname(filePath),
        highlightCssTargetFilePath
      ),
      highlightStyleName,
      isDarkMode: !!highlightStyleName.match(/-dark-?/),
    };
  }

  private highlightHandler(filePath: string, code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        this.USING_HIGHLIGHT_JS_STORE.add(filePath);

        return hljs.highlight(code, {
          language: lang,
          ignoreIllegals: true,
        }).value;
      } catch (err) {
        this.logger.error(err);
      }
    }

    return ""; // use external default escaping
  }

  private extractMetadataOfMarkdownFile(markdownContent: string) {
    const meta_ = markdownContent.match(/^---(.+?)---$/ms);
    if (meta_ && meta_.length > 0) {
      const metadata = meta_[1];
      this.logger.info({
        metadata,
      });

      return metadata;
    } else {
      this.logger.info("not found metadata");
    }
  }

  private parseMetadataOfMarkdownFile(metadata: string): MarkdownMetadata {
    let title = "";
    let layoutPath = "";
    let bannerLink = "";
    const variables = {};

    metadata
      .split("\n")
      .map((it) => it.trim())
      .filter(Boolean)
      .filter((f) => f.match(/^.+:.+$/))
      .forEach((it) => {
        let [key, value] =
          it
            .match(/^(.+?):(.+?)$/)
            ?.slice(1)
            .map((it) => it.trim()) ?? [];

        if (value.match(/^".*"$/)) {
          value = value
            .match(/^"(.*?)"$/)
            ?.splice(1)
            .join("");
        }

        if ("layoutPath" == key) {
          layoutPath = value;
        } else if ("title" == key) {
          title = value;
        } else if ("bannerLink" == key) {
          bannerLink = value;
        } else if (key.match(/^@\w+$/)) {
          variables[key.split("@")[1]] = value;
        }
      });

    return {
      layoutPath,
      title,
      bannerLink,
      variables,
    };
  }

  private injectVariableIntoRenderedContent(
    content: string,
    metadata: MarkdownMetadata
  ): string {
    if (!metadata?.variables) {
      return content;
    }

    let outContent = content;

    const variables = metadata.variables || {};

    const keys = Object.keys(variables);
    for (const key_ of keys) {
      outContent = outContent.replace(
        new RegExp(`{{\s*${key_}\s*}}`, "g"),
        variables[key_]
      );
    }

    return outContent;
  }

  private loadLayoutFile(filePath: string, metadata: MarkdownMetadata): string {
    if (!metadata?.layoutPath) {
      return "";
    }

    const layoutFilePath = path.resolve(
      path.dirname(filePath),
      metadata.layoutPath
    );

    if (!fs.existsSync(layoutFilePath)) {
      return "";
    }

    const ext = path.extname(layoutFilePath);

    if (ext === ".pug") {
      return pug.renderFile(
        layoutFilePath,
        PugRenderHelper.combineConfig(this.renderConfig)
      );
    } else if (ext === ".html") {
      return fs.readFileSync(layoutFilePath).toString("utf-8");
    } else {
      throw new Error(
        `Unsupported layout file: ${layoutFilePath}. Supported only .pug and .html`
      );
    }
  }

  protected async doRender(
    filePath: string,
    rootDir: string,
    outDir: string
  ): Promise<void> {
    if (!filePath.endsWith(".md")) {
      return;
    }

    this.logger.info(filePath);
    const renderConfig = this.renderConfig;
    let markdownContent = fs.readFileSync(filePath).toString("utf-8").trim();

    const metadataContent = this.extractMetadataOfMarkdownFile(markdownContent);
    let metadata: MarkdownMetadata = null;
    let layoutContent = "";
    if (metadataContent) {
      markdownContent = markdownContent.replace(metadataContent, "").trim();
      metadata = this.parseMetadataOfMarkdownFile(metadataContent);
      layoutContent = this.loadLayoutFile(filePath, metadata);
    }

    this.logger.info({ metadata });

    // this.logger.info("config: ", selfConfig_);

    Object.assign(this.selfConfig_, {
      highlight: (code: string, lang: string) => {
        return this.highlightHandler(filePath, code, lang);
      },
    });

    const mdProcesser = markdownit(this.selfConfig_);
    const renderedContent = mdProcesser.render(markdownContent);

    const defaultStyleConfig = this.prepareDefaultMarkdownStyleFile(
      filePath,
      rootDir,
      outDir,
      renderConfig
    );

    let outContentWithHighlightCssAndHTML = `
      <link rel="stylesheet" type="text/css" class="default-markdown-style" href="${defaultStyleConfig.cssFilePath}">

      ${renderedContent}
    `;

    if (this.USING_HIGHLIGHT_JS_STORE.has(filePath)) {
      this.logger.info("highlight js: ", filePath);

      const highlightCssInfo = this.prepareHighlightCssFile(
        filePath,
        rootDir,
        outDir,
        renderConfig
      );

      const isDarkMode = highlightCssInfo.isDarkMode;

      outContentWithHighlightCssAndHTML = `
      <link rel="stylesheet" type="text/css" class="markdown-highlight" href="${
        highlightCssInfo.cssFilePath
      }">
      <style>
        pre:has(code[class*="language-"]) {
          background-color: ${isDarkMode ? "#333" : "#eee"};
          color: ${isDarkMode ? "#ccc" : "#333"};
        }
      </style>

      ${outContentWithHighlightCssAndHTML}
      
      `;
    }

    if (layoutContent && metadata) {
      outContentWithHighlightCssAndHTML = layoutContent
        .replace(/{{\s*content\s*}}/g, outContentWithHighlightCssAndHTML)
        .replace(/{{\s*title\s*}}/g, metadata?.title ?? "")
        .replace(/{{\s*bannerLink\s*}}/g, metadata?.bannerLink ?? "")
        .trim();
    }

    outContentWithHighlightCssAndHTML = this.injectVariableIntoRenderedContent(
      outContentWithHighlightCssAndHTML,
      metadata
    );

    FileSystemHelper.writeOutFile({
      data: outContentWithHighlightCssAndHTML,
      outDir,
      rootDir,
      sourceFilePath: filePath,
      outExtension: ".html",
    });
  }
}
