#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import MarkdownIt from "markdown-it";
import { bundledLanguages, codeToHtml } from "shiki";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(skillRoot, "schema.json");
const templatePath = resolve(skillRoot, "assets/template.html");
const cssPath = resolve(skillRoot, "assets/theme.css");
const mermaidBundlePath = createRequire(import.meta.url).resolve("mermaid/dist/mermaid.min.js");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

// A literal closing script tag ends an HTML script element even when it occurs in a JavaScript string.
const escapeClosingScripts = (source) => source.replace(/<\/script/gi, "<\\/script");

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
// Images are intentionally unsupported because generated pages must not load spec-provided resources.
markdown.disable("image");
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet("rel", "noreferrer");
  return renderer.renderToken(tokens, index, options);
};

const renderMarkdown = (source) => `<div class="markdown">${markdown.render(source)}</div>`;
const heading = (value) => value ? `<h3>${escapeHtml(value)}</h3>` : "";

async function highlightedCode(source, language = "") {
  const normalized = language.trim().toLowerCase();
  if (!normalized || !Object.hasOwn(bundledLanguages, normalized)) {
    return `<pre class="plain-code"><code>${escapeHtml(source)}</code></pre>`;
  }
  try {
    return await codeToHtml(source, {
      lang: normalized,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false
    });
  } catch {
    return `<pre class="plain-code"><code>${escapeHtml(source)}</code></pre>`;
  }
}

async function renderBlock(block, sectionIndex, blockIndex, quizOffset) {
  const prefix = `s${sectionIndex}-b${blockIndex}`;
  switch (block.type) {
    case "markdown":
      return `${heading(block.heading)}${renderMarkdown(block.markdown)}`;
    case "code":
      return `<figure class="code-block">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}${await highlightedCode(block.code, block.language)}</figure>`;
    case "callout":
      return `<aside class="callout ${escapeHtml(block.tone ?? "note")}"><strong>${escapeHtml(block.title)}</strong>${renderMarkdown(block.markdown)}</aside>`;
    case "comparison":
      return `${heading(block.heading)}<div class="comparison"><div><h4>${escapeHtml(block.left.title)}</h4>${renderMarkdown(block.left.markdown)}</div><div><h4>${escapeHtml(block.right.title)}</h4>${renderMarkdown(block.right.markdown)}</div></div>`;
    case "mermaid":
      return `<figure class="mermaid-block" data-mermaid-id="${prefix}">${block.title ? `<figcaption>${escapeHtml(block.title)}</figcaption>` : ""}<div class="mermaid-frame"><div class="mermaid-output" aria-live="polite"></div><pre class="mermaid-source"><code>${escapeHtml(block.diagram)}</code></pre><p class="mermaid-error" role="alert" hidden></p></div></figure>`;
    case "quiz": {
      const cards = block.questions.map((question, index) => {
        const quizIndex = quizOffset + index;
        const correctOption = question.options[question.answer];
        const options = question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="quiz-${quizIndex}" value="${optionIndex}"> ${escapeHtml(option)}</label>`).join("");
        return `<div class="quiz-card" data-answer="${question.answer}"><fieldset><legend>${escapeHtml(question.question)}</legend>${options}</fieldset><button type="button" class="check-answer">Check answer</button><div class="quiz-feedback" aria-live="polite"></div><details class="quiz-answer"><summary>Correct answer: ${escapeHtml(correctOption)}</summary><p>Correct option: <strong class="quiz-correct-option">${escapeHtml(correctOption)}</strong></p><div class="quiz-explanation">${renderMarkdown(question.markdown)}</div></details></div>`;
      }).join("");
      return `${heading(block.title)}${cards}<output class="quiz-score" aria-live="polite"></output>`;
    }
  }
  throw new Error(`Unsupported block type: ${block.type}`);
}

function validateSemanticRules(document) {
  const errors = [];
  const ids = new Set();
  document.sections.forEach((section, sectionIndex) => {
    if (ids.has(section.id)) errors.push(`/sections/${sectionIndex}/id must be unique`);
    ids.add(section.id);
    section.blocks.forEach((block, blockIndex) => {
      const blockPath = `/sections/${sectionIndex}/blocks/${blockIndex}`;
      const markdownFields = [];
      if (block.type === "markdown" || block.type === "callout") markdownFields.push([`${blockPath}/markdown`, block.markdown]);
      if (block.type === "comparison") {
        markdownFields.push([`${blockPath}/left/markdown`, block.left.markdown]);
        markdownFields.push([`${blockPath}/right/markdown`, block.right.markdown]);
      }
      if (block.type === "quiz") {
        block.questions.forEach((question, questionIndex) => {
          if (question.answer >= question.options.length) errors.push(`${blockPath}/questions/${questionIndex}/answer must identify an existing option`);
          markdownFields.push([`${blockPath}/questions/${questionIndex}/markdown`, question.markdown]);
        });
      }
      for (const [path, source] of markdownFields) {
        if (markdown.parse(source, {}).some((token) => token.type === "fence" || token.type === "code_block")) {
          errors.push(`${path} must not contain fenced or indented code blocks; use an adjacent code block instead`);
        }
      }
      if (block.type === "mermaid") {
        const path = `/sections/${sectionIndex}/blocks/${blockIndex}/diagram`;
        const hasInitDirective = /^\s*%%\s*\{\s*(?:init|config)\s*:/im.test(block.diagram);
        const frontmatter = block.diagram.match(/^\s*---\s*\n([\s\S]*?)^\s*---\s*$/m);
        const hasConfigFrontmatter = frontmatter && /^\s*config\s*:/im.test(frontmatter[1]);
        if (hasInitDirective || hasConfigFrontmatter) {
          errors.push(`${path} must not contain Mermaid init or config directives`);
        }
        if (/^\s*(?:click|link|links)\b/im.test(block.diagram)) {
          errors.push(`${path} must not contain Mermaid click or link directives`);
        }
      }
    });
  });
  return errors;
}

async function render(document) {
  let quizOffset = 0;
  const renderedSections = [];
  for (const [sectionIndex, section] of document.sections.entries()) {
    const blocks = [];
    for (const [blockIndex, block] of section.blocks.entries()) {
      blocks.push(await renderBlock(block, sectionIndex, blockIndex, quizOffset));
      if (block.type === "quiz") quizOffset += block.questions.length;
    }
    renderedSections.push(`<section id="${section.id}"><h2>${escapeHtml(section.title)}</h2>${blocks.join("\n")}</section>`);
  }

  let [template, css, mermaidBundle] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(cssPath, "utf8"),
    readFile(mermaidBundlePath, "utf8")
  ]);
  const outline = document.sections.map((section) => `<a href="#${section.id}">${escapeHtml(section.title)}</a>`).join("");
  const slots = new Map([
    ["<!--EXPLANATION_TITLE-->", escapeHtml(document.title)],
    ["<!--EXPLANATION_CSS-->", css],
    ["<!--EXPLANATION_HEADING-->", escapeHtml(document.title)],
    ["<!--EXPLANATION_SUBTITLE-->", escapeHtml(document.subtitle)],
    ["<!--EXPLANATION_OUTLINE-->", outline],
    ["<!--EXPLANATION_SECTIONS-->", renderedSections.join("\n")],
    ["/*EXPLANATION_MERMAID_BUNDLE*/", escapeClosingScripts(mermaidBundle)]
  ]);
  for (const [slot, contents] of slots) template = template.replace(slot, () => contents);
  return template;
}

async function main() {
  const [inputArgument, outputArgument, ...extra] = process.argv.slice(2);
  if (!inputArgument || !outputArgument || extra.length) {
    throw new Error("Usage: node skills/explain-diff-html/scripts/render.mjs <input.json> <output.html>");
  }

  const inputPath = resolve(inputArgument);
  const outputPath = resolve(outputArgument);
  let document;
  try {
    document = JSON.parse(await readFile(inputPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read input JSON at ${inputPath}: ${error.message}`);
  }

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (!validate(document)) {
    const messages = validate.errors.map((error) => {
      const path = error.instancePath || "/";
      const detail = error.keyword === "required" ? `missing ${error.params.missingProperty}` : error.message;
      return `${path}: ${detail}`;
    });
    throw new Error(`Input does not match schema:\n- ${messages.join("\n- ")}`);
  }
  const semanticErrors = validateSemanticRules(document);
  if (semanticErrors.length) throw new Error(`Input is invalid:\n- ${semanticErrors.join("\n- ")}`);

  const html = await render(document);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  console.log(`Rendered ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
