import React from 'react';
import type { PluginComponentProps } from './hs-plugin';
import { hostFrameStyle, colorWithAlpha } from './host-style';
import {
  buildServiceCall, parsePresets, readConfig, resolveHaUrl, sendAnnouncement,
} from './announce';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending'; message: string }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string };

/** How long the "Announced" / error line stays before clearing. */
const STATUS_MS = 4000;

export default function Announce({ config, style }: PluginComponentProps) {
  const title = typeof config.title === 'string' ? config.title : 'Announce';
  const presets = parsePresets(config.presets);
  const showInput = config.showInput !== false;
  const clearAfterSend = config.clearAfterSend !== false;
  const placeholder = (config.placeholder as string) || 'Type an announcement…';

  const [text, setText] = React.useState('');
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  const clearTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(clearTimer.current), []);

  const fg = style.textColor || '#ffffff';
  const tint = (a: number) => colorWithAlpha(fg, a) ?? `rgba(255,255,255,${a})`;
  const busy = status.kind === 'sending';

  const showStatus = (next: Status) => {
    clearTimeout(clearTimer.current);
    setStatus(next);
    if (next.kind === 'sent' || next.kind === 'error') {
      clearTimer.current = setTimeout(() => setStatus({ kind: 'idle' }), STATUS_MS);
    }
  };

  const announce = async (message: string, fromInput: boolean) => {
    if (busy) return;
    const call = buildServiceCall(readConfig(config), message);
    if (typeof call === 'string') { showStatus({ kind: 'error', message: call }); return; }
    const haUrl = resolveHaUrl();
    if (!haUrl) {
      showStatus({ kind: 'error', message: 'Set the Home Assistant URL in plugin settings' });
      return;
    }
    showStatus({ kind: 'sending', message: message.trim() });
    try {
      await sendAnnouncement(haUrl, call);
      showStatus({ kind: 'sent', message: message.trim() });
      if (fromInput && clearAfterSend) setText('');
    } catch (err) {
      showStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to send' });
    }
  };

  const pill: React.CSSProperties = {
    font: 'inherit',
    color: 'inherit',
    border: `1px solid ${tint(0.18)}`,
    background: tint(0.08),
    borderRadius: '999px',
    padding: '0.55em 1em',
    minHeight: '2.6em',
    cursor: 'pointer',
    textAlign: 'left',
    opacity: busy ? 0.6 : 1,
  };

  const statusLine = status.kind === 'idle' ? null : (
    <div
      role="status"
      style={{
        fontSize: '0.85em',
        color: status.kind === 'error' ? '#f87171' : undefined,
        opacity: status.kind === 'error' ? 1 : 0.75,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {status.kind === 'sending' && `Announcing “${status.message}”…`}
      {status.kind === 'sent' && `✓ Announced “${status.message}”`}
      {status.kind === 'error' && status.message}
    </div>
  );

  return (
    <div
      style={{
        ...hostFrameStyle(style),
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75em',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div style={{ fontSize: '1.15em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45em' }}>
          <SpeakerIcon />
          {title}
        </div>
      )}

      {showInput && (
        <form
          onSubmit={(e) => { e.preventDefault(); void announce(text, true); }}
          style={{ display: 'flex', gap: '0.5em' }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            enterKeyHint="send"
            maxLength={500}
            style={{
              flex: 1,
              minWidth: 0,
              font: 'inherit',
              color: 'inherit',
              background: tint(0.08),
              border: `1px solid ${tint(0.22)}`,
              borderRadius: '0.6em',
              padding: '0.6em 0.8em',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            style={{
              font: 'inherit',
              fontWeight: 600,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: '0.6em',
              padding: '0.6em 1.1em',
              minHeight: '2.6em',
              cursor: 'pointer',
              opacity: busy || !text.trim() ? 0.5 : 1,
            }}
          >
            Speak
          </button>
        </form>
      )}

      {presets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', overflowY: 'auto', minHeight: 0 }}>
          {presets.map((p) => (
            <button key={p} type="button" style={pill} disabled={busy} onClick={() => void announce(p, false)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {statusLine}
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M19.4 18.4a9 9 0 0 0 0-12.8" />
    </svg>
  );
}
