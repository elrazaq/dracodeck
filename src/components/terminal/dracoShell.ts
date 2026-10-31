/**
 * DracoShell CLI Engine
 * Exclusive Dracodeck Command Suite with Kali Linux Hybrid Suite Interceptor.
 * Directly executes nmap, whatweb, msfconsole, searchsploit, dirsearch, sqlmap, ffuf, penelope, top, ifconfig, uname.
 * Standard shell commands pass through directly to native ConPTY powershell.exe.
 */

import { OffensiveEngine } from "../../services/offensiveEngine";

export async function executeDracoCommand(
  rawCmd: string
): Promise<string[] | null> {
  const trimmed = rawCmd.trim();
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const bin = parts[0]?.toLowerCase() || "";
  const args = parts.slice(1);

  // 1. Kali Linux Offensive Commands Interceptor
  if (bin === "nmap") {
    const target = args[0] || "127.0.0.1";
    const flags = args.slice(1).join(" ") || "-sV -T4";
    const out = await OffensiveEngine.nmap(target, flags);
    return out.split("\n");
  }

  if (bin === "whatweb") {
    const target = args[0] || "http://localhost:3000";
    const out = await OffensiveEngine.whatweb(target);
    return out.split("\n");
  }

  if (bin === "searchsploit") {
    const query = args.join(" ") || "apache";
    const out = OffensiveEngine.searchsploit(query);
    return out.split("\n");
  }

  if (bin === "msfconsole") {
    const sub = args.join(" ");
    const out = OffensiveEngine.msfconsole(sub);
    return out.split("\n");
  }

  if (bin === "dirsearch") {
    const target = args.find((_, i) => args[i - 1] === "-u") || args[0] || "http://localhost:3000";
    const out = await OffensiveEngine.dirsearch(target);
    return out.split("\n");
  }

  if (bin === "ffuf") {
    const target = args.find((_, i) => args[i - 1] === "-u") || args[0] || "http://localhost:3000";
    const out = await OffensiveEngine.dirsearch(target);
    return out.split("\n");
  }

  if (bin === "sqlmap") {
    const target = args.find((_, i) => args[i - 1] === "-u") || args[0] || "http://localhost:3000/api/users?id=1";
    const out = await OffensiveEngine.sqlmap(target);
    return out.split("\n");
  }

  if (bin === "penelope") {
    const lhost = args[0] || "10.10.14.5";
    const lport = args[1] || "4444";
    const out = OffensiveEngine.penelope(lhost, lport);
    return out.split("\n");
  }

  if (bin === "uname") {
    return [OffensiveEngine.uname()];
  }

  if (bin === "top" || bin === "htop") {
    const out = await OffensiveEngine.top();
    return out.split("\n");
  }

  if (bin === "ifconfig" || bin === "ip") {
    const out = await OffensiveEngine.ifconfig();
    return out.split("\n");
  }

  if (bin === "clear" || bin === "cls" || lower === "draco clear" || lower === "draco cls") {
    return ["__CLEAR__"];
  }

  // 2. Strict check: only intercept commands starting with 'draco'
  if (!lower.startsWith("draco")) {
    return null; // 100% passthrough to native shell (powershell.exe / cmd)
  }

  // 3. ASCII Banner & Draco Operator Blueprint
  return [
    "  ██████╗ ██████╗  █████╗  ██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗",
    "  ██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝██╔════╝██║ ██╔╝",
    "  ██║  ██║██████╔╝███████║██║     ██║   ██║█████╗  ██║     █████╔╝ ",
    "  ██║  ██║██╔══██╗██╔══██║██║     ██║   ██║██╔══╝  ██║     ██╔═██╗ ",
    "  ██████╔╝██║  ██║██║  ██║╚██████╗╚██████╔╝███████╗╚██████╗██║  ██╗",
    "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝",
    "",
    "  ════════════════════════════════════════════════════════════════════",
    "  DRACODECK CLI // EXCLUSIVE KERNEL SUITE v0.1.0",
    "  ════════════════════════════════════════════════════════════════════",
    "",
    "  KALI LINUX OFFENSIVE COMMANDS (Direct execution):",
    "    nmap <target> [-flags]         Network port scanner & service discovery",
    "    whatweb <url>                  Web technology identifier & security headers",
    "    searchsploit <cve|app>         Exploit-DB archive searcher",
    "    msfconsole [command]           Metasploit framework interactive console",
    "    dirsearch -u <url>             Multi-threaded web path fuzzer",
    "    sqlmap -u <url>                SQL injection detection & assessment",
    "    penelope [lhost] [lport]       Reverse shell payload generator & handler",
    "    top / htop                     Process load & active system telemetry",
    "    ifconfig / ip                  Network interface IP, MAC & MTU inspector",
    "    uname -a                       Kali Linux system kernel signature",
    "",
    "  DRACO ENGINE OPS:",
    "    draco suite --recon            Trigger 01 - Info Gathering Matrix",
    "    draco suite --vuln             Trigger 02 - Security Headers & SSL Prober",
    "    draco slayer [port]            Kill zombie dev process locking port",
    "    draco telemetry --live         Stream Antigravity agent telemetry",
    "    draco clear                    Clear active terminal screen buffer",
    "",
    "  NOTE: Native Windows/PowerShell commands (dir, git, ping, etc.) run directly.",
    "  ────────────────────────────────────────────────────────────────────",
    "  OPERATOR: elrazaq // AUTHORIZED OFFENSIVE COCKPIT",
    "",
  ];
}
