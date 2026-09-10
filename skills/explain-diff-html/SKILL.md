---
name: explain-diff-html
description: Use when the user asks for a rich explanation of a code change, diff, branch, or PR. Investigates the change and produces a deterministic, self-contained HTML explanation.
---

# Explain Diff as HTML

Investigate a selected change and turn the findings into a structured explanation. The bundled renderer, rather than the agent, owns HTML, styling, escaping, highlighting, and interaction behavior.

## Workflow

1. **Identify the change.** Confirm the requested diff, commit range, branch, PR, or working-tree change. Read the diff before interpreting it.
2. **Investigate the surrounding system.** Read the changed files and enough callers, tests, configuration, and documentation to explain why the change exists and how data or control moves through it. Distinguish observations from inferences; do not invent intent.
3. **Plan the explanation.** Preserve this learning sequence:
   - **Background:** beginner context followed by the narrower existing-system context.
   - **Intuition:** the central mechanism, causal relationships, and a concrete example with toy data.
   - **Code:** a high-level walkthrough grouped in the order that makes the behavior easiest to follow, not necessarily file order.
   - **Quiz:** five substantive multiple-choice questions when the source material supports them. Avoid trivia and gotchas; explain every answer.
4. **Write a JSON spec** matching `schema.json`, resolved relative to this `SKILL.md`. Use the section IDs `background`, `intuition`, `code`, and `quiz`. Choose only blocks that clarify the actual change: `markdown`, `code`, `callout`, `comparison`, `mermaid`, and `quiz`. A Markdown block has `{ "type": "markdown", "heading"?: string, "markdown": string }`. Callout bodies, comparison side bodies, and quiz explanations also use a `markdown` field; quiz questions and options remain plain text. A Mermaid block has `{ "type": "mermaid", "title"?: string, "diagram": string }` and can express sequence, flowchart or architecture, state, ER, and other Mermaid diagram types. Do not add separate click/detail boxes or other click-to-switch-content UI. Quiz answers are zero-based option indexes.
5. **Render outside the repository.** Resolve `scripts/render.mjs` relative to this `SKILL.md` and use its absolute path, regardless of the project working directory. Keep both the spec and generated page in a temporary directory. Use a date-prefixed output filename:

   ```sh
   node <absolute-skill-directory>/scripts/render.mjs \
     /tmp/explain-diff-html/change.json \
     /tmp/YYYY-MM-DD-explanation-change.html
   ```

   The renderer validates the schema and semantic references before writing output. Validation failures include JSON paths. Fix the spec rather than editing generated HTML.
6. **Verify the result.** Confirm the command succeeded, both files exist, the HTML opens locally, all four sections appear in the Outline, code blocks are readable, Mermaid diagrams render, and quiz, theme, and horizontal Outline controls work. Confirm there are no external loaded-resource elements (such as linked stylesheets or scripts with `src`); ordinary hyperlinks are allowed because opening one requires an explicit reader action. The embedded Mermaid bundle contains upstream URL strings but loads no network resources. The file must remain fully offline.
7. **Return both absolute paths**: the validated JSON spec and generated HTML.

## Writing guidance

Write clear, precise technical prose. Introduce concepts incrementally, show concrete values moving through the system, and state causal relationships explicitly. Avoid hype, slogans, theatrical framing, unnecessary jargon, and repetitive “not X, but Y” contrasts.

Use callouts for definitions, constraints, and consequential edge cases. Use comparison blocks only for a real side-by-side distinction. Use Mermaid flowcharts for ordered movement between components and Mermaid sequence diagrams when participant-to-participant messages and payloads matter. Mermaid init/config directives and click/link directives are forbidden so the renderer retains consistent styling and behavior. Put sequential or staged explanations in an ordinary Markdown ordered list, with adjacent `code` or `mermaid` blocks when a stage needs source or a diagram.

Markdown supports paragraphs, ordered and unordered lists, emphasis, strong text, inline backtick code, blockquotes, links, and tables. Raw HTML is rendered as text, and dangerous link schemes are not made clickable. Do not put fenced or indented multiline code inside Markdown; use an adjacent `code` block so Shiki can highlight it.

Repository and user content belongs only in JSON string fields. Never put HTML or JavaScript in the spec expecting it to execute: the renderer escapes all such content. Unknown code languages intentionally render as plain escaped code. Do not hand-edit the generated page or add generated explanations to Git.

## Schema at a glance

The root object contains `title`, `subtitle`, and `sections`. Every section has `id`, `title`, and `blocks`. See `schema.json` for the exact required fields, allowed values, lengths, and block shapes. The renderer bundles local `assets/template.html`, `assets/theme.css`, and Mermaid's browser runtime, applies Shiki highlighting at render time, and emits one self-contained HTML file with no external runtime dependencies.
