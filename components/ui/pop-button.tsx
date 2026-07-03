import React from "react";
import { cn } from "@/lib/utils";

export interface PopButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function PopButton({ className, children = "Learn More", ...props }: PopButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center font-semibold text-white",
        "px-6 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 border-2 border-indigo-950",
        "transition-all duration-150 ease-[cubic-bezier(0,0,0.58,1)]",
        "shadow-[0_4px_0_-1px_rgba(255,255,255,0.2),0_4px_0_0_#1e1b4b,0_8px_10px_-2px_rgba(0,0,0,0.3)]",
        "hover:from-indigo-400 hover:to-violet-500 hover:translate-y-[2px] hover:shadow-[0_2px_0_-1px_rgba(255,255,255,0.2),0_2px_0_0_#1e1b4b,0_4px_8px_-2px_rgba(0,0,0,0.3)]",
        "active:from-indigo-400 active:to-violet-500 active:translate-y-[4px] active:shadow-[0_0px_0_-1px_rgba(255,255,255,0.2),0_0px_0_0_#1e1b4b,0_0px_0_0_rgba(0,0,0,0)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default PopButton;
