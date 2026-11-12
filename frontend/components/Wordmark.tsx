"use client";

import { useSiteSettings } from "./SiteSettings";

export function Wordmark() {
  const { app_name } = useSiteSettings();
  return (
    <span className="flex items-baseline select-none" aria-label={app_name}>
      <span className="text-[20px] leading-none font-bold tracking-[-0.035em] text-ink">{app_name}</span>
      <span className="ml-0.5 size-[6px] rounded-full bg-accent" aria-hidden />
    </span>
  );
}
