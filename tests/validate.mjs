import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const parse = (path) => JSON.parse(read(path));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pkg = parse("package.json");
assert(pkg.pi?.extensions?.includes("./extensions"), "package must expose extensions");
assert(pkg.pi?.skills?.includes("./skills"), "package must expose skills");
assert(pkg.pi?.prompts?.includes("./prompts"), "package must expose prompts");
assert(pkg.peerDependencies?.["@earendil-works/pi-ai"] === "*", "Pi AI must remain a peer dependency");
assert(
  pkg.peerDependencies?.["@earendil-works/pi-coding-agent"] === "*",
  "Pi coding agent must remain a peer dependency",
);

const worktreeExtension = read("extensions/worktree.ts");
assert(worktreeExtension.includes('registerCommand("worktree"'), "worktree command must be registered");
assert(
  read("extensions/worktree-session.mjs").includes("SessionManager.forkFrom"),
  "worktree command must support full-history transfer",
);
assert(worktreeExtension.includes("ctx.switchSession"), "worktree command must replace the active session safely");
assert(
  read("extensions/worktree-session.mjs").includes("parentSession"),
  "worktree handoffs must retain source-session provenance",
);

const skill = read("skills/simple-software/SKILL.md");
assert(skill.startsWith("---\nname: simple-software\n"), "skill frontmatter is missing or invalid");
assert(skill.includes("description:"), "skill needs a discovery description");

const explanationSkill = read("skills/explain-diff-html/SKILL.md");
assert(explanationSkill.startsWith("---\nname: explain-diff-html\n"), "explanation skill frontmatter is missing or invalid");
assert(explanationSkill.includes("scripts/render.mjs"), "explanation skill must document its renderer");
const explanationSchema = parse("skills/explain-diff-html/schema.json");
assert(explanationSchema.$defs?.mermaid, "explanation schema must define Mermaid blocks");
assert(explanationSchema.$defs?.markdown, "explanation schema must define Markdown blocks");
assert(!explanationSchema.$defs?.stepper && !explanationSchema.$defs?.prose, "removed explanation blocks must stay absent");
assert(pkg.dependencies?.["markdown-it"] === "15.0.1", "markdown-it must remain exactly pinned");
for (const path of [
  "skills/explain-diff-html/scripts/render.mjs",
  "skills/explain-diff-html/assets/template.html",
  "skills/explain-diff-html/assets/theme.css"
]) assert(read(path).length > 0, `${path} must not be empty`);

const prReviewSkill = read("skills/github-pr-review/SKILL.md");
assert(prReviewSkill.startsWith("---\nname: github-pr-review\n"), "PR review skill frontmatter is missing or invalid");
assert(prReviewSkill.includes("simple-software"), "PR review must apply the engineering principles");
assert(prReviewSkill.includes("explain-diff-html"), "PR review must always generate an explanation");
assert(prReviewSkill.includes("hunk skill path hunk-review"), "PR review must resolve Hunk's bundled skill");
const prReviewPrompt = read("prompts/pr-review.md");
assert(prReviewPrompt.includes("$@") && prReviewPrompt.includes("github-pr-review"), "PR review prompt must pass arguments to its skill");

for (const phase of ["plan", "implement", "review", "commit"]) {
  const prompt = read(`prompts/${phase}.md`);
  assert(prompt.startsWith("---\n"), `${phase} prompt frontmatter is missing`);
  assert(prompt.includes("$@"), `${phase} prompt must accept optional guidance`);
}
for (const phase of ["plan", "implement", "review"]) {
  assert(read(`prompts/${phase}.md`).includes("simple-software"), `${phase} prompt must load the engineering principles`);
}
const commitPrompt = read("prompts/commit.md");
assert(commitPrompt.includes("configured upstream"), "commit prompt must push to the configured upstream");
assert(commitPrompt.includes("do not guess a remote or force"), "commit prompt must handle push failures safely");

const subagents = parse("config/pi-subagents.json");
assert(subagents.asyncByDefault === false, "subagents must default to foreground execution");
assert(subagents.maxSubagentDepth === 1, "nested delegation must be capped at one level");
assert(subagents.globalConcurrencyLimit === 4, "subagent concurrency must remain bounded");
assert(subagents.maxSubagentSpawnsPerSession === 0, "long-lived sessions must not have a cumulative spawn cap");
assert(subagents.maxSubagentSpawnsPerRun === 8, "individual runs must retain a spawn cap");
assert(subagents.maxActiveAsyncRunsPerSession === 3, "simultaneous top-level async runs must remain bounded");
assert(subagents.parallel?.maxTasks === 8, "parallel fanout must retain a task cap");
assert(subagents.parallel?.concurrency === 4, "parallel execution must remain bounded");
assert(subagents.scheduledRuns?.enabled === false, "schedules must remain disabled initially");

const mcpExample = parse("config/mcp.example.json");
for (const name of ["playwright", "figma", "chrome-devtools"]) {
  const server = mcpExample.mcpServers?.[name];
  assert(server, `MCP example must configure ${name}`);
  assert(["codemode", "codemode-deferred"].includes(server.exposure), `${name} must stay out of direct tool declarations`);
  assert(!("lifecycle" in server), `${name} must use native Pi MCP fields`);
  assert(!("directTools" in server), `${name} must not use adapter-only fields`);
}
assert(mcpExample.mcpServers.figma.env?.FIGMA_API_KEY === "${FIGMA_API_KEY}", "Figma example must use an environment placeholder");
assert(mcpExample.mcpServers.playwright.toolExposure?.browser_run_code_unsafe === "hidden", "Playwright unsafe code execution must stay hidden");
assert(mcpExample.mcpServers["chrome-devtools"].toolExposure?.["*"] === "hidden", "Chrome DevTools must default to a tool allowlist");
assert(read("docs/mcp.md").includes("Context policy"), "MCP setup must document its context policy");

const fragment = parse("config/settings.fragment.json");
assert(!fragment.packages?.some((entry) => String(entry?.source ?? entry).includes("pi-mcp-adapter")), "settings fragment must use Pi's built-in MCP support");
const disabled = fragment.subagents?.agentOverrides ?? {};
for (const name of ["evidence-auditor", "oracle", "delegate", "claude-code", "codex-exec", "cursor-agent"]) {
  assert(disabled[name]?.disabled === true, `${name} must be disabled in the initial surface`);
}

console.log("Customization package validation passed.");
