import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function dracoAntigravityDevPlugin() {
  return {
    name: "draco-antigravity-bridge",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith("/__draco_antigravity/")) {
          return next();
        }
        try {
          const bridge = require("./electron/antigravityBridge.cjs");
          let rawBody = "";
          await new Promise<void>((resolve) => {
            req.on("data", (chunk: any) => {
              rawBody += chunk.toString();
            });
            req.on("end", () => resolve());
          });
          const body = rawBody ? JSON.parse(rawBody) : {};

          res.setHeader("Content-Type", "application/json");
          if (req.url.startsWith("/__draco_antigravity/connect-scope")) {
            const result = await bridge.connectScope(body.workspacePath, body.options || {});
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/send-prompt")) {
            const result = await bridge.sendPrompt(body);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/get-models")) {
            const result = await bridge.getAvailableModels();
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/get-usage")) {
            const result = bridge.getUsageStats();
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/get-skills")) {
            const result = bridge.getAvailableSkills(body.workspacePath);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/get-messages")) {
            const result = bridge.getSessionMessages(body.conversationId);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/delete-session")) {
            const result = bridge.deleteSession(body.conversationId, body.workspacePath);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/stop-prompt")) {
            const result = bridge.stopPrompt(body.conversationId);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url.startsWith("/__draco_antigravity/save-attachment")) {
            const result = bridge.saveAttachment(body.base64Data, body.fileName, body.conversationId);
            res.end(JSON.stringify(result));
            return;
          }
          res.statusCode = 404;
          res.end(JSON.stringify({ ok: false, error: "Not found" }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: err?.message || "Bridge error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), dracoAntigravityDevPlugin()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      strict: false,
    },
  },
}));
