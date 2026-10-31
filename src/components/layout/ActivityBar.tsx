import React from "react";
import { FolderTree, Terminal, Radio, Zap, Sliders } from "lucide-react";
import { ActivePanel } from "../../types";

interface ActivityBarProps {
  activePanel: ActivePanel;
  onSelectPanel: (panel: ActivePanel) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activePanel,
  onSelectPanel,
}) => {
  const topItems: { id: ActivePanel; label: string; icon: React.ReactNode }[] = [
    {
      id: "explorer",
      label: "Workspace Files",
      icon: <FolderTree className="w-4 h-4" />,
    },
    {
      id: "terminal",
      label: "ConPTY Terminal",
      icon: <Terminal className="w-4 h-4" />,
    },
    {
      id: "telemetry",
      label: "Antigravity Telemetry",
      icon: <Radio className="w-4 h-4" />,
    },
    {
      id: "slayer",
      label: "Zombie Port Slayer",
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-12 bg-[#0a0e17] border-r border-[#1b253b] flex flex-col justify-between items-center py-2 select-none">
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPanel(item.id)}
              title={item.label}
              className={`relative w-full h-10 flex items-center justify-center transition-colors ${
                isActive
                  ? "text-[#00e5ff] bg-[#111726]/60"
                  : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#111726]/30"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00e5ff]" />
              )}
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Bottom Config */}
      <div className="w-full flex flex-col items-center">
        <button
          onClick={() => onSelectPanel("settings")}
          title="System Settings"
          className={`relative w-full h-10 flex items-center justify-center transition-colors ${
            activePanel === "settings"
              ? "text-[#00e5ff] bg-[#111726]/60"
              : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#111726]/30"
          }`}
        >
          {activePanel === "settings" && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00e5ff]" />
          )}
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
