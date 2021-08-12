/* eslint no-warning-comments: off */
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const lowlight = require("lowlight");
// const refractor = require("refractor");

const KNOWN_EXTENSIONS = {
  ".js": "javascript",
  ".ts": "typescript",
  ".json": "json",
};

function highlightjs(content, language) {
  return lowlight.highlight(language, content, { prefix: "" }).value;
}

// function prism(content, language) {
//   return refractor.highlight(content, language);
// }

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const makeHast = highlightjs;

function higlightCode(content, language) {
  const hastNodes = makeHast(content, language);
  const spans = flattenHastNode({
    type: "element",
    tagName: "span",
    properties: { className: [] },
    children: hastNodes,
  });
  const lines = [];
  if (spans.length) {
    lines.push([]);
    spans.forEach((span) => {
      if (span.linebreak) {
        lines.push([]);
      }
      lines[lines.length - 1].push(span);
    });
  }
  const htmlLines = lines.map((spans) => {
    if (spans.length === 1 && spans[0].text === "") {
      return "<span>&nbsp;</span>";
    }
    return spans
      .map(({ classes, text }) =>
        [
          "<span",
          ...(classes.length
            ? [
                ` class="${classes
                  .map((c) => `hljs-${c}`)
                  .map(escapeHtml)
                  .join(" ")}"`,
              ]
            : []),
          `>${escapeHtml(text)}</span>`,
        ].join("")
      )
      .join("");
  });
  return htmlLines;
}

const LINEBREAK_CAPTURE_RE = /(\r?\n)/;
const LINEBREAK_RE = /\r?\n/;

function flattenHastNode(node, classes = []) {
  if (node.type === "text") {
    return node.value
      .split(LINEBREAK_CAPTURE_RE)
      .filter((p) => p.length > 0)
      .map((p) => ({
        text: p.replace(LINEBREAK_RE, ""),
        linebreak: LINEBREAK_RE.test(p),
        classes: classes,
        content: p,
      }));
  } else if (node.type === "element") {
    if (node.tagName !== "span") {
      throw new Error(
        `Don't know how to handle element with tag "${node.tagName}": ${node}`
      );
    }
    const childClasses = [...classes, ...(node.properties.className || [])];
    const children = (node.children || []).map((child) =>
      flattenHastNode(child, childClasses)
    );
    return children.reduce((list, child) => {
      list.push(...child);
      return list;
    }, []);
  } else {
    throw new Error(
      `Oops, do not know how to handle node of type "${node.type}": ${node}`
    );
  }
}

async function main(root, outputDir, outputPrefix) {
  const templatePath = path.resolve(__dirname, "resources", "source-page.hbs");
  const templateContent = await fs.promises.readFile(templatePath, "utf-8");
  const template = handlebars.compile(templateContent);

  const addPrefix = outputPrefix ? (x) => path.join(outputPrefix, x) : (x) => x;
  const stat = await fs.promises.stat(root);
  if (stat.isDirectory()) {
    return processDir(template, root, outputDir, addPrefix, "");
  }
  return processFile(
    template,
    path.dirname(root),
    outputDir,
    addPrefix,
    path.basename(root)
  );
}

async function processDir(
  template,
  rootDir,
  outputDir,
  addPrefix,
  relativePath
) {
  const dirPath = path.resolve(rootDir, relativePath);
  const dirEnts = await fs.promises.readdir(dirPath, {
    withFileTypes: true,
    encoding: "utf-8",
  });
  const promiseToGenerateIndex = generateDirIndex(
    rootDir,
    outputDir,
    addPrefix,
    relativePath,
    dirEnts
  );
  const promiseToRecurse = Promise.all(
    dirEnts.map(async (dirEnt) => {
      if (dirEnt.isDirectory()) {
        return processDir(
          template,
          rootDir,
          outputDir,
          addPrefix,
          path.join(relativePath, dirEnt.name)
        );
      } else if (dirEnt.isFile()) {
        return processFile(
          template,
          rootDir,
          outputDir,
          addPrefix,
          path.join(relativePath, dirEnt.name)
        );
      }
      return null;
    })
  );
  await Promise.all([promiseToGenerateIndex, promiseToRecurse]);
}

// TODO: Render bread crumbs.
// TODO: Use a template for this.
async function generateDirIndex(
  rootDir,
  outputDir,
  addPrefix,
  relPath,
  dirEnts
) {
  const outputPath = `${path.resolve(outputDir, addPrefix(relPath))}.html`;
  const dirName = path.basename(outputPath, ".html");
  const contents = `<ul>${dirEnts
    .map((dirEnt) => {
      return `<li><a href="${dirName}/${dirEnt.name}.html">${dirEnt.name}</a></li>`;
    })
    .join("\n")}</ul>`;
  await fs.promises.writeFile(outputPath, contents, "utf-8");
  console.log(`Generated index of ${relPath} (${outputPath})`);
}

async function processFile(template, rootDir, outputDir, addPrefix, relPath) {
  const sourcePath = path.resolve(rootDir, relPath);
  const outputPath = `${path.resolve(outputDir, addPrefix(relPath))}.html`;
  const ext = path.extname(relPath);
  const lang = KNOWN_EXTENSIONS[ext] || "plaintext";
  const sourceCode = await fs.promises.readFile(sourcePath, "utf-8");
  const highlightedLines = higlightCode(sourceCode, lang);
  const highlightedCode = `<table>
    <tr>
      <td id="linenumbers">${new Array(highlightedLines.length)
        .fill(null)
        .map(
          (_, idx) =>
            `<a href='#n${idx + 1}'><span id="n${idx + 1}" class="linenumber">${
              idx + 1
            }</span></a>`
        )
        .join("\n")}</td>
      <td id="highlightedCode">${highlightedLines
        .map(
          (line, idx) => `<span id="l${idx + 1}" class="line">${line}</span>`
        )
        .join("\n")}</td>
    </tr>
  </table>`;
  const fullpath = addPrefix(relPath);
  const pathComponents = fullpath.split("/");
  const breadCrumbs = [
    // FIXME: This doesn't work when the root for the script is a file, like when we render package.json
    `<a href="${escapeHtml(
      new Array(pathComponents.length - 1).fill("..").join("/")
    )}/index.html" title="Project Homepage">.</a>`,
    ...pathComponents.map((p, idx) => {
      const depth = pathComponents.length - 1 - idx;
      const href =
        depth === 0
          ? "#"
          : `${new Array(depth).fill("..").join("/")}/${p}.html`;
      return `<a href="${escapeHtml(href)}" title="${escapeHtml(
        pathComponents.slice(0, idx + 1).join("/")
      )}">${escapeHtml(p)}</a>`;
    }),
  ];
  // TODO: Also add a link to the file in this commit in the repo.
  const output = template({
    basename: path.basename(sourcePath),
    dirname: path.dirname(sourcePath),
    fullpath,
    breadCrumbsHtml: breadCrumbs.join(" / "),
    highlightedCode,
    sourceCode,
    lang,
    ext,
  });
  await fs.promises.writeFile(outputPath, output, "utf-8");
  console.log(`Rendered ${relPath} as ${lang} (${outputPath})`);
}

async function enter() {
  try {
    const [, , rootDir, outputDir, outputPrefix] = process.argv;
    await main(rootDir, outputDir, outputPrefix);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

enter();
