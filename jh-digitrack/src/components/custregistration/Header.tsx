import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/auth";

interface HeaderProps {
  title?: string;
  status?: string;
}

function Header({ title, status }: HeaderProps) {
  const { data: currentUser } = useCurrentUser();
  const [uaeTime, setUaeTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setUaeTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex glass-card h-8 rounded-xl items-center px-3 justify-between">
      <div className="flex items-center gap-5">
        {title && <span className="text-sm font-semibold text-gray-700">{title}</span>}
        {status && <span className="text-xs text-gray-500">{status}</span>}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">UAE Time: {uaeTime}</span>
        {currentUser && <span className="text-xs text-gray-500">{currentUser}</span>}
      </div>
    </div>
  );
}

export default Header;
