import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const renderer = resolve(root, "skills/explain-diff-html/scripts/render.mjs");
const fixture = resolve(root, "tests/fixtures/explain-diff-html.json");

const invoke = (input, output) => spawnSync(process.execPath, [renderer, input, output], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
});

async function renderFixture(context, prefix = "explain-diff-html-") {
  const directory = await mkdtemp(resolve(tmpdir(), prefix));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = resolve(directory, "explanation.json");
  const output = resolve(directory, "explanation.html");
  await writeFile(input, await readFile(fixture, "utf8"), "utf8");
  const result = invoke(input, output);
  assert.equal(result.status, 0, result.stderr);
  return { directory, input, output, html: await readFile(output, "utf8") };
}

test("renderer creates a safe, self-contained themed explanation", async (context) => {
  const { html } = await renderFixture(context);

  for (const id of ["background", "intuition", "code", "quiz"]) {
    assert.match(html, new RegExp(`<section id="${id}">`), `${id} section should render`);
    assert.match(html, new RegExp(`<a href="#${id}">`), `${id} should appear in the Outline`);
  }
  for (const component of ["markdown", "callout", "comparison", "mermaid-block", "quiz-card"]) {
    assert.match(html, new RegExp(`class="[^"]*${component}`), `${component} should render`);
  }
  assert.equal((html.match(/class="mermaid-block"/g) ?? []).length, 2, "both Mermaid diagrams should render as blocks");
  assert.match(html, /class="mermaid-source"><code>flowchart LR/, "Mermaid source should be inert readable text");

  const documentMarkup = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(documentMarkup, /<link\b|<script\b[^>]*\bsrc\s*=|<(?:img|iframe|audio|video|source)\b[^>]*\bsrc\s*=/i, "document markup must not load external resources");
  assert.match(documentMarkup, /<a href="https:\/\/example\.com\/http" rel="noreferrer">HTTP overview<\/a>/, "ordinary hyperlinks should remain clickable without becoming loaded resources");
  assert.match(html, /globalThis\["mermaid"\]/, "the Mermaid browser bundle should be embedded");
  assert.equal((html.match(/<script>/g) ?? []).length, 2, "only the embedded Mermaid bundle and page behavior should execute");
  assert.match(html, /securityLevel: "strict"/, "Mermaid must use strict security");
  assert.match(html, /suppressErrorRendering: true/, "Mermaid should retain the renderer's readable error fallback");
  assert.match(html, /catch \(error\)[\s\S]+Mermaid render failed:[\s\S]+errorOutput.hidden = false/, "render errors should reveal a readable fallback");

  const themeSelect = html.match(/<select id="theme-select"[\s\S]*?<\/select>/)?.[0] ?? "";
  assert.deepEqual([...themeSelect.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map((match) => [match[1], match[2]]), [
    ["technical-paper", "Technical Paper"],
    ["blueprint", "Blueprint"],
    ["warm-editorial", "Warm Editorial"]
  ]);
  assert.match(html, /<html lang="en" data-theme="technical-paper"/, "Technical Paper should be the non-JS default");
  for (const theme of ["technical-paper", "blueprint", "warm-editorial"]) {
    assert.match(html, new RegExp(`:root\\[data-theme="${theme}"\\]`), `${theme} should recolor the page`);
    assert.match(html, new RegExp(`(?:"${theme}"|${theme}): \\{[\\s\\S]+?theme: "base"[\\s\\S]+?themeVariables:[\\s\\S]+?themeCSS:`), `${theme} should define a base Mermaid theme`);
  }
  assert.match(html, /let mermaidRenderGeneration = 0;[\s\S]+const generation = \+\+mermaidRenderGeneration;[\s\S]+generation !== mermaidRenderGeneration/, "Mermaid rendering should reject stale asynchronous generations");
  assert.match(html, /localStorage\.getItem[\s\S]+catch[\s\S]+localStorage\.setItem[\s\S]+catch/, "file storage restrictions should not break controls");

  assert.match(html, /:root\[data-theme="blueprint"\] \.shiki[\s\S]+var\(--shiki-dark-bg\)/, "Blueprint should use dark Shiki colors");
  assert.match(html, /:root\[data-theme="technical-paper"\] \.shiki,[\s\S]+:root\[data-theme="warm-editorial"\] \.shiki[\s\S]+var\(--shiki-light-bg\)/, "paper themes should use light Shiki colors");

  assert.match(html, /class="layout"[\s\S]+class="outline-sidebar"[\s\S]+class="outline-rail"/, "Outline should use a horizontal sidebar grid and persistent rail");
  assert.match(html, /id="outline-toggle" aria-expanded="true" aria-controls="outline-panel" aria-label="Collapse outline" title="Collapse outline"/, "Outline toggle should expose disclosure semantics");
  assert.match(html, /data-outline-collapsed="true"\] \.layout \{ grid-template-columns: 2\.75rem minmax\(0, 1fr\)/, "collapsed Outline should return width to content");
  assert.match(html, /collapsed \? "Open outline" : "Collapse outline"/, "collapsed rail should retain reopening semantics");
  assert.doesNotMatch(html, /<details class="outline"/, "Outline must not collapse vertically with details");
  assert.doesNotMatch(html, /sequence-message|sequence-detail|data-interactive|flow-diagram|flow-node|stepper|step-button|step-panel|stepper-layout/, "obsolete click-to-switch-content machinery should be absent");

  assert.match(html, /@media print[\s\S]+\.outline-sidebar, \.theme-control, button, \.quiz-feedback \{ display: none !important; \}[\s\S]+\.quiz-answer, \.quiz-answer > :not\(summary\)/, "print output should hide controls while retaining quiz explanations");
  assert.doesNotMatch(documentMarkup, /linear-gradient|class="[^"]*\bhero\b|class="[^"]*\bpill\b|box-shadow/, "page design should have no gradients, hero, pills, or shadows");

  const highlightedBlocks = html.match(/<pre class="shiki[\s\S]*?<\/pre>/g) ?? [];
  assert.ok(highlightedBlocks.length >= 4, "known code languages should receive static Shiki highlighting");
  assert.ok(highlightedBlocks.every((block) => block.includes("<span")), "highlighted code should contain Shiki tokens");
  assert.match(html, /<pre class="plain-code"><code>&lt;\/script&gt;&lt;img onerror=alert\(1\)&gt; &amp; value<\/code><\/pre>/, "unknown languages should remain escaped plain code");
  assert.match(html, /class="quiz-card"[\s\S]+class="check-answer"[\s\S]+class="quiz-feedback" aria-live="polite"[\s\S]+<details class="quiz-answer">/, "quiz behavior and no-JS answers should remain");
});

test("Markdown renders supported rich text safely with restrained styling", async (context) => {
  const { html } = await renderFixture(context, "explain-diff-html-markdown-");
  const documentMarkup = html.replace(/<script>[\s\S]*?<\/script>/g, "");

  for (const construct of [
    /<p>The browser sends a request/,
    /<ol>[\s\S]*<li>Validate the request\.<\/li>/,
    /<ul>[\s\S]*<li>Full requests receive a document\.<\/li>/,
    /<strong>Rust handler<\/strong>/,
    /<em>response<\/em>/,
    /<code>Content-Type<\/code>/,
    /<blockquote>[\s\S]*Persisted state remains authoritative\./,
    /<table>[\s\S]*<th>Request<\/th>[\s\S]*<td>Fragment<\/td>/
  ]) assert.match(documentMarkup, construct);

  assert.match(documentMarkup, /<a href="https:\/\/example\.com\/http" rel="noreferrer">HTTP overview<\/a>/);
  assert.doesNotMatch(documentMarkup, /href="(?:javascript|data|vbscript):/i, "dangerous protocols must not become links");
  assert.match(documentMarkup, /\[script\]\(javascript:alert\(1\)\)/, "rejected dangerous links should remain inert text");
  assert.match(documentMarkup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;&lt;img src=x onerror=alert\(1\)&gt;/, "raw HTML should be escaped");
  assert.doesNotMatch(documentMarkup, /<script>alert\(1\)<\/script>|<img src=x/i);

  assert.match(html, /\.markdown ul, \.markdown ol \{/);
  assert.match(html, /\.markdown blockquote \{/);
  assert.match(html, /\.markdown table \{/);
  assert.match(html, /\.markdown th, \.markdown td \{/);
  assert.match(documentMarkup, /class="comparison"[\s\S]*class="markdown"[\s\S]*<strong>changed fragment<\/strong>/, "comparison bodies should render Markdown");
  assert.match(documentMarkup, /class="callout important"[\s\S]*class="markdown"[\s\S]*href="https:\/\/example\.com\/contract"/, "callout bodies should render Markdown");
  assert.match(documentMarkup, /class="quiz-explanation"[\s\S]*class="markdown"[\s\S]*<strong>database<\/strong>/, "quiz explanations should render Markdown");
});

test("Mermaid source is escaped as inert text including closing scripts", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-mermaid-escape-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = resolve(directory, "explanation.json");
  const output = resolve(directory, "explanation.html");
  const document = JSON.parse(await readFile(fixture, "utf8"));
  document.sections[1].blocks[0].diagram = 'flowchart LR\n A["</script><img onerror=alert(1)> fish & chips"] --> B[Safe]';
  await writeFile(input, JSON.stringify(document), "utf8");

  const result = invoke(input, output);
  assert.equal(result.status, 0, result.stderr);
  const html = await readFile(output, "utf8");
  assert.equal((html.match(/<\/script>/gi) ?? []).length, 2, "input must not create another executable script boundary");
  const documentMarkup = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(documentMarkup, /<img\b/i, "malicious Mermaid markup must not become an element");
  assert.match(documentMarkup, /&lt;\/script&gt;&lt;img onerror=alert\(1\)&gt; fish &amp; chips/, "all malicious Mermaid source should remain escaped");
});

test("template substitutions preserve replacement metacharacters literally", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-metacharacters-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = resolve(directory, "explanation.json");
  const output = resolve(directory, "explanation.html");
  const document = JSON.parse(await readFile(fixture, "utf8"));
  const metacharacters = "$& replacement; $' suffix; $` prefix";
  const escaped = "$&amp; replacement; $&#39; suffix; $` prefix";
  document.title = metacharacters;
  document.subtitle = metacharacters;
  document.sections[0].title = metacharacters;
  await writeFile(input, JSON.stringify(document), "utf8");

  const result = invoke(input, output);
  assert.equal(result.status, 0, result.stderr);
  const html = await readFile(output, "utf8");
  assert.ok(html.includes(`<title>${escaped}</title>`));
  assert.ok(html.includes(`<h1>${escaped}</h1>`));
  assert.ok(html.includes(`<p>${escaped}</p>`));
  assert.equal(html.split(escaped).length - 1, 5, "replacement metacharacters should remain literal in every slot");
});

test("obsolete and removed block types are rejected", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-obsolete-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  for (const type of ["flow", "sequence", "stepper", "prose"]) {
    const input = resolve(directory, `${type}.json`);
    const output = resolve(directory, `${type}.html`);
    const document = JSON.parse(await readFile(fixture, "utf8"));
    document.sections[1].blocks[0].type = type;
    await writeFile(input, JSON.stringify(document), "utf8");
    const result = invoke(input, output);
    assert.notEqual(result.status, 0, `${type} should fail schema validation`);
    assert.match(result.stderr, /\/sections\/1\/blocks\/0/);
    await assert.rejects(readFile(output, "utf8"), { code: "ENOENT" });
  }
});

test("stepper implementation and guidance are completely absent", async () => {
  for (const path of [
    "skills/explain-diff-html/schema.json",
    "skills/explain-diff-html/scripts/render.mjs",
    "skills/explain-diff-html/assets/template.html",
    "skills/explain-diff-html/assets/theme.css",
    "skills/explain-diff-html/SKILL.md",
    "tests/fixtures/explain-diff-html.json"
  ]) {
    const source = await readFile(resolve(root, path), "utf8");
    assert.doesNotMatch(source, /stepper|step-button|step-panel|stepper-layout/i, `${path} should not retain stepper behavior`);
  }
});

test("fenced and multiline code in Markdown receives path-specific guidance", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-markdown-code-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const cases = [
    {
      name: "block",
      mutate(document) { document.sections[0].blocks[0].markdown = "```js\nalert(1)\n```"; },
      path: "/sections/0/blocks/0/markdown"
    },
    {
      name: "callout",
      mutate(document) { document.sections[0].blocks[2].markdown = "~~~rust\nfn main() {}\n~~~"; },
      path: "/sections/0/blocks/2/markdown"
    },
    {
      name: "comparison",
      mutate(document) { document.sections[0].blocks[1].left.markdown = "    indented_code()"; },
      path: "/sections/0/blocks/1/left/markdown"
    },
    {
      name: "quiz",
      mutate(document) { document.sections[3].blocks[0].questions[0].markdown = "```\nmultiline\n```"; },
      path: "/sections/3/blocks/0/questions/0/markdown"
    }
  ];

  for (const testCase of cases) {
    const input = resolve(directory, `${testCase.name}.json`);
    const output = resolve(directory, `${testCase.name}.html`);
    const document = JSON.parse(await readFile(fixture, "utf8"));
    testCase.mutate(document);
    await writeFile(input, JSON.stringify(document), "utf8");
    const result = invoke(input, output);
    assert.notEqual(result.status, 0, `${testCase.name} should fail Markdown code validation`);
    assert.match(result.stderr, new RegExp(`${testCase.path.replaceAll("/", "\\/")} must not contain fenced or indented code blocks; use an adjacent code block instead`));
    await assert.rejects(readFile(output, "utf8"), { code: "ENOENT" });
  }
});

test("unsafe Mermaid directives receive path-specific errors", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-directives-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const cases = [
    ["init", "%%{init: {'theme': 'dark'}}%%\nflowchart LR\nA-->B", /\/sections\/1\/blocks\/0\/diagram must not contain Mermaid init or config directives/],
    ["config", "%%{config: {'look': 'handDrawn'}}%%\nflowchart LR\nA-->B", /\/sections\/1\/blocks\/0\/diagram must not contain Mermaid init or config directives/],
    ["frontmatter-config", "---\nconfig:\n  theme: forest\n---\nflowchart LR\nA-->B", /\/sections\/1\/blocks\/0\/diagram must not contain Mermaid init or config directives/],
    ["click", "flowchart LR\nA-->B\nclick A callback", /\/sections\/1\/blocks\/0\/diagram must not contain Mermaid click or link directives/],
    ["link", "sequenceDiagram\nparticipant A\nlink A: Home @ https://example.invalid", /\/sections\/1\/blocks\/0\/diagram must not contain Mermaid click or link directives/]
  ];
  for (const [name, diagram, expected] of cases) {
    const input = resolve(directory, `${name}.json`);
    const output = resolve(directory, `${name}.html`);
    const document = JSON.parse(await readFile(fixture, "utf8"));
    document.sections[1].blocks[0].diagram = diagram;
    await writeFile(input, JSON.stringify(document), "utf8");
    const result = invoke(input, output);
    assert.notEqual(result.status, 0, `${name} should fail semantic validation`);
    assert.match(result.stderr, expected);
    await assert.rejects(readFile(output, "utf8"), { code: "ENOENT" });
  }
});

test("renderer reports duplicate IDs and quiz paths without output", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "explain-diff-html-semantics-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const cases = [
    {
      name: "duplicate-section",
      mutate(document) { document.sections.push(structuredClone(document.sections[0])); },
      error: /\/sections\/4\/id must be unique/
    },
    {
      name: "quiz-answer",
      mutate(document) { document.sections[3].blocks[0].questions[0].answer = 99; },
      error: /\/sections\/3\/blocks\/0\/questions\/0\/answer must identify an existing option/
    }
  ];
  for (const testCase of cases) {
    const input = resolve(directory, `${testCase.name}.json`);
    const output = resolve(directory, `${testCase.name}.html`);
    const document = JSON.parse(await readFile(fixture, "utf8"));
    testCase.mutate(document);
    await writeFile(input, JSON.stringify(document), "utf8");
    const result = invoke(input, output);
    assert.notEqual(result.status, 0, `${testCase.name} should fail`);
    assert.match(result.stderr, testCase.error);
    await assert.rejects(readFile(output, "utf8"), { code: "ENOENT" });
  }
});
