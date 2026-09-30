# MCP Setup

Pi `0.99.1` provides built-in Model Context Protocol support. This setup uses
that implementation directly rather than installing a separate MCP extension.

## Context policy

- Keep browser servers behind `codemode-deferred` so their large tool surfaces
  stay out of ordinary model tool declarations and the inline codemode budget.
- Keep the small Figma server behind `codemode` so its two tools are available
  without becoming direct model tools.
- Search for and describe a relevant tool before calling unfamiliar tools.
- Request narrow results: exact Figma nodes, focused accessibility snapshots,
  and summarized diagnostics rather than whole-page or whole-file dumps.
- Keep large screenshots, traces, and other artifacts in files when the server
  supports it.
- Hide unsafe or unnecessary tools explicitly. Chrome DevTools uses a default-
  hidden allowlist, and Playwright's unsafe code execution tool stays hidden.

Unlike the previous adapter, native Pi MCP connects enabled servers when a
session starts. If startup cost becomes noticeable, set an infrequently used
server to `"enabled": false` and enable it from `/mcp` when needed.

## Division of responsibility

| Need | Server |
|---|---|
| Read design data and download design assets | `figma` |
| Operate or verify a browser flow | `playwright` |
| Diagnose console, network, CSS, performance, or Lighthouse problems | `chrome-devtools` |
| Create a repeatable regression check | Repository Playwright tests, not MCP |

The configured Figma server is the community
[`figma-developer-mcp`](https://github.com/glips/figma-context-mcp), not Figma's
official hosted server. It has a small read-oriented surface and uses
`FIGMA_API_KEY` from the environment.

## Installation

Pi's MCP support is built in; no MCP package needs to be installed. Copy the
example to Pi's user configuration path:

```sh
cp config/mcp.example.json ~/.pi/agent/mcp.json
chmod 600 ~/.pi/agent/mcp.json
```

Set `FIGMA_API_KEY` outside the repository and ensure the Pi process inherits
it. Do not put tokens in either MCP configuration file.

Validate every enabled server from the shell:

```sh
pi mcp list
```

Restart Pi or run `/reload` after configuration changes. Use `/mcp` to inspect
connections, effective tool exposure, and server errors.

## Browser process notes

The local configuration launches `/usr/bin/chromium`. Playwright inherits the
graphical-session environment because headed Chromium may need `DISPLAY` or
`WAYLAND_DISPLAY`, `XDG_RUNTIME_DIR`, and session-bus variables. Chrome DevTools
uses an isolated profile and disables usage statistics and CrUX lookups.

If a service-hosted Pi cannot launch the headed Playwright browser, start
Playwright MCP in the graphical session:

```sh
npx -y @playwright/mcp@0.0.80 \
  --executable-path /usr/bin/chromium \
  --port 8931
```

Then replace the Playwright stdio entry with a native streamable HTTP entry:

```json
{
  "url": "http://127.0.0.1:8931/mcp",
  "description": "Operate and verify browser flows with Playwright",
  "exposure": "codemode-deferred",
  "toolExposure": {
    "browser_run_code_unsafe": "hidden"
  }
}
```

Do not publish that endpoint through Tailscale or another network interface.

## Deferred options

- Figma's official hosted MCP server remains a separate experiment because
  client support and authentication behavior should be verified first.
- Browserbase's Stagehand-backed MCP server should be considered only for
  demonstrated remote or selector-resistant automation needs.
- WebMCP is an experimental browser API implemented by websites, not a server
  to add to this configuration.
- Chrome memory-analysis tools remain hidden until a concrete debugging task
  needs them.
