import { STYLE_INFO, type StyleOption } from "@shared/schema";

export function StyleTag({ style, styleCustom }: { style: string; styleCustom?: string | null }) {
  const info = STYLE_INFO[style as StyleOption];
  if (!info) return null;
  const label = style === 'OTHER' && styleCustom ? styleCustom.slice(0, 6).toUpperCase() : info.short;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide flex-shrink-0"
      style={{ color: info.color, backgroundColor: info.color + '22', border: `1px solid ${info.color}55` }}
    >
      {label}
    </span>
  );
}
