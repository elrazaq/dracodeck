/**
 * DracoShell CLI Engine
 * Exclusive Dracodeck Command Suite.
 * Custom 'draco' commands invoke native Electron backend services.
 * All standard OS & offensive commands (nmap, sqlmap, git, npm, dir, ls) pass through directly to native ConPTY PowerShell.
 */

export async function executeDracoCommand(
  rawCmd: string
): Promise<string[] | null> {
  const trimmed = rawCmd.trim();
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const bin = parts[0]?.toLowerCase() || "";
  const sub = parts[1]?.toLowerCase() || "";

  // 1. Terminal Canvas Clear
  if (bin === "clear" || bin === "cls" || lower === "draco clear" || lower === "draco cls") {
    return ["__CLEAR__"];
  }

  // 2. Strict Check: Only intercept commands prefixed with 'draco'
  // Everything else passes through 100% to native ConPTY powershell.exe / wsl.exe
  if (bin !== "draco") {
    return null;
  }

  // 3. 'draco port' / 'draco slayer' -> Real Win32 Port Slayer
  if (sub === "port" || sub === "slayer" || sub === "ports") {
    if (window.dracoAPI?.slayerScanPorts) {
      try {
        const ports = await window.dracoAPI.slayerScanPorts();
        const listening = ports.filter((p: any) => p.state === "LISTENING");
        const lines = [
          "  PORT      PROTO   PID      PROCESS           SERVICE / LABEL",
          "  ───────────────────────────────────────────────────────────────────",
        ];
        listening.slice(0, 15).forEach((p: any) => {
          const portCol = p.port.toString().padEnd(9);
          const protoCol = p.protocol.padEnd(7);
          const pidCol = p.pid.toString().padEnd(8);
          const procCol = p.processName.padEnd(17);
          lines.push(`  ${portCol} ${protoCol} ${pidCol} ${procCol} ${p.label}`);
        });
        lines.push("  ───────────────────────────────────────────────────────────────────");
        lines.push(`  [+] Total active listening ports: ${listening.length}`);
        return lines;
      } catch (err: any) {
        return [`[-] Failed to scan ports: ${err.message}`];
      }
    }
    return ["[-] DracoAPI slayer engine not available."];
  }

  // 4. 'draco kill <pid>' -> Real Win32 Tree Termination
  if (sub === "kill" && parts[2]) {
    const targetPid = parseInt(parts[2], 10);
    if (isNaN(targetPid)) {
      return ["[-] Syntax: draco kill <pid>"];
    }
    if (window.dracoAPI?.slayerKillProcess) {
      const res = await window.dracoAPI.slayerKillProcess(targetPid, true);
      if (res.success) {
        return [`[+] Successfully terminated PID ${targetPid} and child process tree.`];
      } else {
        return [`[-] Termination failed: ${res.error}`];
      }
    }
    return ["[-] DracoAPI slayer engine not available."];
  }

  // 5. 'draco vuln <url>' -> Real Zero-CORS Vulnerability Audit
  if (sub === "vuln" && parts[2]) {
    const target = parts[2];
    if (window.dracoAPI?.vulnScan) {
      const res = await window.dracoAPI.vulnScan(target);
      const lines = [
        `[*] Running real OWASP audit against: ${res.targetUrl}`,
        `[*] Scan completed in ${res.durationMs}ms`,
        "  ───────────────────────────────────────────────────────────────────",
      ];
      res.findings.forEach((f: any, idx: number) => {
        lines.push(`  [${f.severity}] #${idx + 1} ${f.title}`);
        lines.push(`      Evidence: ${f.evidence.substring(0, 80)}...`);
      });
      lines.push("  ───────────────────────────────────────────────────────────────────");
      lines.push(`[+] Critical: ${res.summary.critical} | High: ${res.summary.high} | Medium: ${res.summary.medium} | Pass: ${res.summary.pass}`);
      return lines;
    }
  }

  // 6. Default 'draco' / 'draco help' -> Cyberdeck ASCII Banner & Syntax Dictionary
  return [
    "  ██████╗ ██████╗  █████╗  ██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗",
    "  ██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝██╔════╝██║ ██╔╝",
    "  ██║  ██║██████╔╝███████║██║     ██║   ██║█████╗  ██║     █████╔╝ ",
    "  ██║  ██║██╔══██╗██╔══██║██║     ██║   ██║██╔══╝  ██║     ██╔═██╗ ",
    "  ██████╔╝██║  ██║██║  ██║╚██████╗╚██████╔╝███████╗╚██████╗██║  ██╗",
    "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝",
    "",
    "  DRACODECK OFFENSIVE-GRADE DEVELOPER COCKPIT // RUNTIME v0.1.0",
    "  ARCHITECTURE: ConPTY Streaming Bridge & Node.js Zero-CORS Engine",
    "  ─────────────────────────────────────────────────────────────────",
    "  AVAILABLE DRACO CLI SYNTAX:",
    "    draco                        Display Dracodeck banner & syntax dictionary",
    "    draco port / draco slayer    Scan listening Win32 dev sockets and PIDs",
    "    draco kill <pid>             Force terminate process tree (frees zombie ports)",
    "    draco vuln <url>             Execute real zero-CORS web vulnerability audit",
    "    draco clear                  Clear terminal viewport",
    "",
    "  ALL NATIVE TOOLS (nmap, sqlmap, git, npm, python, cargo) EXECUTE DIRECTLY IN CONPTY.",
    "  ─────────────────────────────────────────────────────────────────",
    "  OPERATOR: elrazaq // GOV-GRADE COCKPIT READY",
  ];
}
