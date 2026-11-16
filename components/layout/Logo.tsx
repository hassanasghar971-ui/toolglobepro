import { useId } from "react";

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `tgGrad${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ToolGlobe Pro logo"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradId})`} />
      <g fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="25" r="12" />
        <ellipse cx="24" cy="25" rx="5.2" ry="12" />
        <path d="M12 25h24" />
      </g>
      <path
        d="M36 6.5l1.3 3.2 3.2 1.3-3.2 1.3L36 15.5l-1.3-3.2-3.2-1.3 3.2-1.3z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function Logo({
  showText = true,
  size = 36,
  className = "",
}: {
  showText?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          <span>
            Tool<span className="text-brand-600 dark:text-brand-400">Globe</span>
          </span>
          <span className="rounded-md bg-linear-to-r from-brand-600 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-white">
            Pro
          </span>
        </span>
      )}
    </span>
  );
}
