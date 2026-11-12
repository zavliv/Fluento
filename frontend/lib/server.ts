import { cacheLife } from "next/cache";
import { API_URL } from "./api";
import { DEFAULT_SETTINGS, type PublicSettings } from "./site";
import type { Teacher } from "./teachers";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`);
    return res.ok ? ((await res.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getPublicData(): Promise<{ settings: PublicSettings; teachers: Teacher[] }> {
  "use cache";
  cacheLife("minutes");
  const [settings, teachers] = await Promise.all([
    getJson<PublicSettings>("/app-settings", DEFAULT_SETTINGS),
    getJson<Teacher[]>("/teachers", []),
  ]);
  return { settings, teachers };
}
