# HTTP Functions Reference

Use this reference when the task is clearly about an HTTP Function: REST API, browser-facing endpoint, SSE stream, or WebSocket service.

## Core model

HTTP Functions are standard web services, not `exports.main(event, context)` handlers.

- Handle requests through `req` and `res`.
- Listen on port `9000`.
- Ship an executable `scf_bootstrap` file.
- Include runtime dependencies in the package; HTTP Functions do not auto-install `node_modules` for you.
- For simple HTTP APIs, prefer the Node.js native `http` module so the function shape stays explicit and dependency-light. Only introduce Express, Koa, NestJS, or similar frameworks when the user explicitly asks for one or the service complexity justifies it.

## Minimal structure

```text
my-http-function/
├── scf_bootstrap
├── package.json
├── node_modules/
└── index.js
```

### `scf_bootstrap`

```bash
#!/bin/bash
/var/lang/node18/bin/node index.js
```

Requirements:

- File name must be exactly `scf_bootstrap`.
- Use LF line endings.
- Make it executable with `chmod +x scf_bootstrap`.

## Minimal Node.js example

```javascript
const http = require("http");
const { URL } = require("url");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/echo") {
    try {
      const body = await readJsonBody(req);
      sendJson(res, 200, { received: body });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
});

server.listen(9000);
```

## Code-writing rules

- Do not write HTTP Functions as `exports.main = async (event, context) => {}`. That is the Event Function contract.
- Start an HTTP server explicitly with `http.createServer(...)` or a framework app, and always bind to port `9000`.
- Choose one Node.js module system and keep it consistent. For simple HTTP Functions, CommonJS is the safest default: use `require(...)` and leave `"type": "module"` out of `package.json`.
- If you intentionally use ES Modules, use `import ...` consistently and do not rely on CommonJS-only globals such as bare `__dirname`, `require(...)`, or `module.exports`. When you need the current file path in ESM, derive it from `import.meta.url`.
- Treat routing, method checks, and body parsing as part of the function code. With the native `http` module, parse `req.url` yourself and read the request body from the stream before calling `JSON.parse`.
- Return JSON responses explicitly and set `Content-Type` yourself, for example `application/json; charset=utf-8`.
- Keep unsupported routes and methods explicit. Return `404` for unknown paths, and return `405` when the path exists but the HTTP method is not allowed.
- Keep `scf_bootstrap`, `index.js`, `package.json`, and any bundled dependencies in the function directory that will be uploaded.

### Module system note

The minimal examples in this document use CommonJS:

- `const http = require("http")`
- no `"type": "module"` in `package.json`

That combination avoids the common ESM pitfall where `__dirname` is not defined. If you switch to ES Modules, switch the whole function to `import` syntax and update any file-path logic accordingly.

## Request handling rules

- With Node native `http`, use `new URL(req.url, "http://127.0.0.1")` and read `url.searchParams` for query values.
- With Node native `http`, `req.body` does not exist. Read the body stream manually, then parse JSON yourself.
- `req.headers` -> incoming HTTP headers.
- Path parameters are framework-level conveniences. With the native `http` module, match `url.pathname` yourself.
- Always send a response explicitly. With Node native `http`, use `res.writeHead(...)` and `res.end(...)`.
- Return meaningful status codes such as `400`, `401`, `404`, `405`, `500`.

### Example with method checks

```javascript
const http = require("http");
const { URL } = require("url");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (url.pathname === "/users" && req.method === "POST") {
    try {
      const { name, email } = await readJsonBody(req);

      if (!name || !email) {
        sendJson(res, 400, { error: "name and email are required" });
        return;
      }

      sendJson(res, 201, { name, email });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }

    return;
  }

  if (url.pathname === "/users") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
});

server.listen(9000);
```

### Express 5 catch-all note

If the user explicitly asks for Express, keep in mind that Express 5 uses `path-to-regexp` semantics for wildcards. Do not use bare `*` or `/*` as the catch-all route.

```javascript
app.all("/{*splat}", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});
```

Express 5 note: `app.all("/{*splat}", (req, res) => {` is the safe catch-all form when you also need to match the root path `/`, because the router is based on `path-to-regexp` rather than the older Express 4 wildcard behavior.

## Deployment flow

Prefer `manageFunctions` over CLI in agent flows.

```javascript
manageFunctions({
  action: "createFunction",
  func: {
    name: "myHttpFunction",
    type: "HTTP",
    protocolType: "HTTP",
    timeout: 60
  },
  functionRootPath: "/absolute/path/to/cloudfunctions"
});
```

### WebSocket

For WebSocket workloads, keep the function type as HTTP and switch `protocolType`:

```javascript
manageFunctions({
  action: "createFunction",
  func: {
    name: "mySocketFunction",
    type: "HTTP",
    protocolType: "WS"
  },
  functionRootPath: "/absolute/path/to/cloudfunctions"
});
```

## Invocation options

### HTTP API with token

```bash
curl -L "https://{envId}.api.tcloudbasegateway.com/v1/functions/{name}?webfn=true" \
  -H "Authorization: Bearer <TOKEN>"
```

This is suitable for authenticated server-to-server access.

### HTTP access path for browser/public access

Creating the function does not automatically create a browser-facing path. Add gateway access separately when the user actually needs it.

```javascript
manageGateway({
  action: "createAccess",
  targetType: "function",
  targetName: "myHttpFunction",
  type: "HTTP",
  path: "/api/hello"
});
```

Before enabling anonymous access, confirm both of these:

1. The access path exists.
2. The function security rule allows the intended caller identity.

If an external caller reports `EXCEED_AUTHORITY`, inspect the function permission first with `queryPermissions(action="getResourcePermission", resourceType="function")` before widening access.

## SSE and WebSocket notes

### SSE

```javascript
res.setHeader("Content-Type", "text/event-stream");
res.write(`data: ${JSON.stringify({ content: "Hello" })}\n\n`);
```

### WebSocket example

```javascript
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 9000 });

wss.on("connection", (ws) => {
  ws.on("message", (message) => ws.send(`Echo: ${message}`));
});
```

## When to stop and reroute

- If the task is actually a timer-triggered or SDK-invoked serverless function, reroute to Event Functions.
- If the task needs long-lived containers, custom system packages, or broader service architecture, reroute to `cloudrun-development`.
- If the task is only about HTTP API calling patterns rather than implementation, reroute to `http-api`.
