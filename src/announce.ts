/**
 * Builds and sends the Home Assistant service call for one announcement.
 * Kept free of React so it can be unit-tested.
 */

export const PLUGIN_ID = 'ha-announce';

const AUTH_HEADER = { Authorization: 'Bearer {{ha_token}}' };
const TIMEOUT_MS = 15000;

export interface AnnounceConfig {
  mode: 'script' | 'tts';
  scriptEntity: string;
  messageField: string;
  ttsEntity: string;
  mediaPlayers: string[];
}

export interface ServiceCall {
  path: string;
  body: Record<string, unknown>;
}

export function readConfig(config: Record<string, unknown>): AnnounceConfig {
  const str = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback;
  return {
    mode: config.mode === 'tts' ? 'tts' : 'script',
    scriptEntity: str(config.scriptEntity, 'script.announcement'),
    messageField: str(config.messageField, 'message'),
    ttsEntity: str(config.ttsEntity, ''),
    mediaPlayers: splitList(config.mediaPlayers),
  };
}

export function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v !== 'string') return [];
  return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export function parsePresets(v: unknown): string[] {
  if (typeof v !== 'string') return [];
  return v.split('\n').map((s) => s.trim()).filter(Boolean);
}

/** Returns the call to make, or an error string describing what's missing. */
export function buildServiceCall(cfg: AnnounceConfig, message: string): ServiceCall | string {
  const text = message.trim();
  if (!text) return 'Type a message first';
  if (cfg.mode === 'tts') {
    if (!cfg.ttsEntity.startsWith('tts.')) return 'Set a TTS entity (tts.…) in the module settings';
    if (cfg.mediaPlayers.length === 0) return 'Pick at least one speaker in the module settings';
    return {
      path: '/api/services/tts/speak',
      body: {
        entity_id: cfg.ttsEntity,
        media_player_entity_id: cfg.mediaPlayers,
        message: text,
        cache: false,
      },
    };
  }
  if (!cfg.scriptEntity.startsWith('script.')) return 'Set a script entity (script.…) in the module settings';
  // script.turn_on returns immediately instead of waiting for the speech to finish.
  return {
    path: '/api/services/script/turn_on',
    body: { entity_id: cfg.scriptEntity, variables: { [cfg.messageField]: text } },
  };
}

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Own setting first, then the official Home Assistant plugin's. */
export function resolveHaUrl(): string {
  const sdk = window.__HS_SDK__;
  const own = sdk?.getPluginSettings?.(PLUGIN_ID)?.haUrl;
  if (typeof own === 'string' && own.trim()) return normalizeUrl(own);
  const shared = sdk?.getPluginSettings?.('home-assistant')?.haUrl;
  if (typeof shared === 'string' && shared.trim()) return normalizeUrl(shared);
  return '';
}

export async function sendAnnouncement(haUrl: string, call: ServiceCall): Promise<void> {
  const sdk = window.__HS_SDK__;
  if (!sdk?.pluginFetch) throw new Error('Home Screens SDK unavailable');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Home Assistant did not answer')), TIMEOUT_MS);
  });
  try {
    const res = await Promise.race([
      sdk.pluginFetch(PLUGIN_ID, {
        url: `${haUrl}${call.path}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(call.body),
        secretInjections: { header: AUTH_HEADER },
        cacheTtlMs: 0,
      }),
      timeout,
    ]);
    if (!res.ok) throw new Error(await errorMessage(res));
  } finally {
    clearTimeout(timer);
  }
}

async function errorMessage(res: Response): Promise<string> {
  if (res.status === 401) return 'Home Assistant rejected the token';
  if (res.status === 404) return 'Home Assistant has no such script or service';
  let detail = '';
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      detail = json.message || json.error || text;
    } catch {
      detail = text;
    }
  } catch { /* body unreadable */ }
  detail = detail.trim().slice(0, 120);
  return detail ? `Failed (${res.status}): ${detail}` : `Failed (${res.status})`;
}
