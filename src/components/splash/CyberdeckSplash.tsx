import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Shield, Terminal, GitBranch, Zap } from "lucide-react";
import { DracodeLogo } from "../common/DracodeLogo";
import { SysInfo } from "../../vite-env";

interface CyberdeckSplashProps {
  workspace: string | null;
  onComplete: () => void;
}

interface BootStep {
  id: string;
  subsystem: string;
  detail: string;
  status: "OK" | "ACTIVE" | "READY";
}

export const CyberdeckSplash: React.FC<CyberdeckSplashProps> = ({
  workspace,
  onComplete,
}) => {
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [wslStatus, setWslStatus] = useState<{ hasWSL: boolean; isKali: boolean } | null>(null);
  const [driveCount, setDriveCount] = useState<number>(0);
  const [gitBranch, setGitBranch] = useState<string>("scanning...");
  const [progress, setProgress] = useState<number>(8);
  const [bootSteps, setBootSteps] = useState<BootStep[]>([]);

  useEffect(() => {
    let cancelled = false;

    const runHardwareBoot = async () => {
      const steps: BootStep[] = [];

      // Step 1: Query Real Host Hardware via Node os module
      if (window.dracoAPI?.getSysInfo) {
        try {
          const info = await window.dracoAPI.getSysInfo();
          if (!cancelled) {
            setSysInfo(info);
            const totalGb = (info.totalMem / 1073741824).toFixed(1);
            const freeGb = (info.freeMem / 1073741824).toFixed(1);
            steps.push({
              id: "KERN",
              subsystem: "HOST_KERNEL_PROBE",
              detail: `${info.hostname} // ${info.platform}-${info.arch} (${info.release})`,
              status: "OK",
            });
            steps.push({
              id: "CPU",
              subsystem: "SMP_PROCESSOR_MATRIX",
              detail: `${info.cpus}x Logical Cores // ${info.cpuModel.trim()} (Load: ${info.cpuLoadPct ?? 0}%)`,
              status: "OK",
            });
            steps.push({
              id: "MEM",
              subsystem: "PHYSICAL_MEMORY_ALLOC",
              detail: `${freeGb} GB Free / ${totalGb} GB Total Physical RAM`,
              status: "OK",
            });
            setBootSteps([...steps]);
            setProgress(38);
          }
        } catch {}
      }

      // Step 2: Query Real Storage Volumes
      if (window.dracoAPI?.getDrives) {
        try {
          const drv = await window.dracoAPI.getDrives();
          if (!cancelled && drv?.drives) {
            setDriveCount(drv.drives.length);
            steps.push({
              id: "VFS",
              subsystem: "STORAGE_VOLUME_MOUNT",
              detail: `Mounted ${drv.drives.length} Host Partitions (${drv.drives.map((d) => d.path).join(" ")})`,
              status: "READY",
            });
            setBootSteps([...steps]);
            setProgress(62);
          }
        } catch {}
      }

      // Step 3: Query WSL2 / ConPTY Bridge
      if (window.dracoAPI?.checkWSL) {
        try {
          const wsl = await window.dracoAPI.checkWSL();
          if (!cancelled) {
            setWslStatus(wsl);
            steps.push({
              id: "PTY",
              subsystem: "WIN32_CONPTY_DAEMON",
              detail: `PowerShell ConPTY Active // WSL2 Subsystem: ${wsl.hasWSL ? (wsl.isKali ? "KALI-LINUX" : "DETECTED") : "NATIVE-WIN32"}`,
              status: "ACTIVE",
            });
            setBootSteps([...steps]);
            setProgress(84);
          }
        } catch {}
      }

      // Step 4: Query Real Workspace Git & Sentinel Engine
      if (workspace && window.dracoAPI?.gitStatus) {
        try {
          const st = await window.dracoAPI.gitStatus(workspace);
          if (!cancelled) {
            const br = st.isRepo ? `${st.branch} (${st.totalDirty} modified)` : "UNTRACKED_FS";
            setGitBranch(br);
            steps.push({
              id: "GIT",
              subsystem: "DRACODE_WORKSPACE_SYNC",
              detail: `Scope [${workspace}] -> Branch: ${br}`,
              status: "READY",
            });
            setBootSteps([...steps]);
          }
        } catch {}
      } else {
        setGitBranch("STANDBY");
      }

      if (!cancelled) {
        steps.push({
          id: "SEC",
          subsystem: "SENTINEL_10VEC_ENGINE",
          detail: "Zero-CORS Offensive Socket & Dracode Studio Initialized",
          status: "READY",
        });
        setBootSteps([...steps]);
        setProgress(100);
      }
    };

    runHardwareBoot();

    const finishTimer = setTimeout(() => {
      if (!cancelled) onComplete();
    }, 2100);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelled = true;
      clearTimeout(finishTimer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [workspace, onComplete]);

  const totalMemGb = sysInfo ? (sysInfo.totalMem / 1073741824).toFixed(1) : "--";
  const usedMemPct = sysInfo
    ? Math.round(((sysInfo.totalMem - sysInfo.freeMem) / sysInfo.totalMem) * 100)
    : 0;

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0 z-[100] bg-[#06040a] text-[#e2e8f0] font-mono flex flex-col justify-between p-6 select-none overflow-hidden cursor-pointer"
    >
      {/* Brutalist Tactical Grid & Scanline Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#261d3822_1px,transparent_1px),linear-gradient(to_bottom,#261d3822_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff007f] via-[#00e5ff] to-[#00e676]" />

      {/* Top System Frame Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-[#261d38] pb-3 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 bg-[#ff007f] text-white font-bold tracking-widest">
            DRACODECK // OS-BOOT
          </span>
          <span className="text-[#00e5ff] font-bold">
            KERNEL: {sysInfo ? `${sysInfo.platform.toUpperCase()} ${sysInfo.release}` : "PROBING..."}
          </span>
          <span className="text-[#443a57]">|</span>
          <span className="text-[#00e676]">
            NODE: {sysInfo?.hostname || "LOCALHOST"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#7a7194]">
          <span className="w-2 h-2 rounded-full bg-[#00e676] animate-ping" />
          <span>[ESC / CLICK TO ENTER KALI DESKTOP]</span>
        </div>
      </div>

      {/* Center Brutalist Cyberdeck Core */}
      <div className="relative z-10 max-w-4xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 5 Cols: Identity Emblem & Live Hardware Readout */}
        <div className="lg:col-span-5 bg-[#0d0816] border-2 border-[#261d38] p-5 relative shadow-[0_0_50px_rgba(255,0,127,0.12)]">
          <div className="absolute -top-2.5 left-3 px-2 bg-[#06040a] text-[10px] font-bold text-[#ff007f] tracking-widest border border-[#ff007f]/40">
            SYSTEM IDENTITY
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="p-2.5 bg-[#120c1f] border border-[#ff007f]/50">
              <DracodeLogo size={54} glow={true} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white leading-none">
                DRACODECK
              </h1>
              <p className="text-[10px] text-[#00e5ff] font-bold tracking-widest mt-1">
                OFFENSIVE DEVELOPER COCKPIT
              </p>
              <p className="text-[10px] text-[#7a7194] mt-0.5">
                DRACODE STUDIO + KALI RUNTIME
              </p>
            </div>
          </div>

          {/* Real Hardware Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#120c1f] border border-[#261d38] p-2">
              <div className="flex items-center gap-1.5 text-[#7a7194] mb-0.5">
                <Cpu className="w-3 h-3 text-[#00e5ff]" />
                <span>CPU CORES</span>
              </div>
              <p className="text-xs font-bold text-[#e2e8f0]">
                {sysInfo ? `${sysInfo.cpus} Threads (${sysInfo.cpuLoadPct ?? 0}%)` : "Detecting..."}
              </p>
            </div>

            <div className="bg-[#120c1f] border border-[#261d38] p-2">
              <div className="flex items-center gap-1.5 text-[#7a7194] mb-0.5">
                <Zap className="w-3 h-3 text-[#ff007f]" />
                <span>RAM MATRIX</span>
              </div>
              <p className="text-xs font-bold text-[#e2e8f0]">
                {sysInfo ? `${totalMemGb} GB (${usedMemPct}% Used)` : "Detecting..."}
              </p>
            </div>

            <div className="bg-[#120c1f] border border-[#261d38] p-2">
              <div className="flex items-center gap-1.5 text-[#7a7194] mb-0.5">
                <HardDrive className="w-3 h-3 text-[#00e676]" />
                <span>VOLUMES / WSL</span>
              </div>
              <p className="text-xs font-bold text-[#00e676]">
                {driveCount} Drives // {wslStatus?.hasWSL ? "WSL2 Ready" : "Win32 Native"}
              </p>
            </div>

            <div className="bg-[#120c1f] border border-[#261d38] p-2">
              <div className="flex items-center gap-1.5 text-[#7a7194] mb-0.5">
                <GitBranch className="w-3 h-3 text-[#ff8800]" />
                <span>GIT STATE</span>
              </div>
              <p className="text-xs font-bold text-[#ff8800] truncate">
                {gitBranch}
              </p>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Live Kernel & Daemon Boot Stream */}
        <div className="lg:col-span-7 bg-[#0b0713] border-2 border-[#261d38] p-5 relative flex flex-col justify-between min-h-[250px]">
          <div className="absolute -top-2.5 left-3 px-2 bg-[#06040a] text-[10px] font-bold text-[#00e5ff] tracking-widest border border-[#00e5ff]/40 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#00e5ff]" />
            <span>LIVE SUBSYSTEM INITIALIZATION TELEMETRY</span>
          </div>

          <div className="space-y-2 my-2 font-mono text-[11px]">
            {bootSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-start justify-between gap-3 border-b border-[#261d38]/50 pb-1.5"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[#ff007f] font-bold shrink-0">[{step.id}]</span>
                  <span className="text-[#00e5ff] font-bold shrink-0">{step.subsystem}:</span>
                  <span className="text-[#cbd5e1] truncate">{step.detail}</span>
                </div>
                <span className="px-1.5 py-0.2 bg-[#00e676]/15 border border-[#00e676] text-[#00e676] text-[9px] font-bold shrink-0">
                  {step.status}
                </span>
              </div>
            ))}
          </div>

          {/* Brutalist Progress Bar */}
          <div className="mt-4 pt-3 border-t border-[#261d38]">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-[#ff007f] font-bold tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#ff007f]" />
                <span>MOUNTING KALI DESKTOP ENVIRONMENT...</span>
              </span>
              <span className="text-[#00e5ff] font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#161026] border border-[#261d38] overflow-hidden p-0.5">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-[#ff007f] via-[#00e5ff] to-[#00e676] transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Status */}
      <div className="relative z-10 flex items-center justify-between border-t border-[#261d38] pt-3 text-[10px] text-[#7a7194]">
        <span>ACTIVE WORKSPACE: {workspace || "ROOT_DRIVE"}</span>
        <span className="text-[#e2e8f0]">TARGET LANDING: <strong className="text-[#00e5ff]">KALI DESKTOP SPACE</strong></span>
      </div>
    </div>
  );
};
