"use client";
import { useId } from "react";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
  size?: "sm" | "md"; // ⬅️ ajout
};

export default function NeonSwitch({
  checked,
  onChange,
  label,
  className = "",
  size = "md",
}: Props) {
  const id = useId();
  const small = size === "sm";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`select-none cursor-pointer ${small ? "text-xs" : "text-sm"}`}
        >
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${small ? "scale-75 origin-left" : ""}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      />
    </div>
  );
}
