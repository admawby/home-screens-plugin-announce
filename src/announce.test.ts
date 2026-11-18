import { describe, expect, it } from 'vitest';
import { buildServiceCall, parsePresets, readConfig, splitList } from './announce';

describe('buildServiceCall', () => {
  it('runs the script with the message as a variable', () => {
    const cfg = readConfig({ mode: 'script', scriptEntity: 'script.announcement', messageField: 'message' });
    expect(buildServiceCall(cfg, '  Dinner is ready!  ')).toEqual({
      path: '/api/services/script/turn_on',
      body: { entity_id: 'script.announcement', variables: { message: 'Dinner is ready!' } },
    });
  });

  it('defaults to script.announcement / message', () => {
    expect(buildServiceCall(readConfig({}), 'hi')).toEqual({
      path: '/api/services/script/turn_on',
      body: { entity_id: 'script.announcement', variables: { message: 'hi' } },
    });
  });

  it('calls tts.speak with every speaker', () => {
    const cfg = readConfig({ mode: 'tts', ttsEntity: 'tts.google_en_com', mediaPlayers: 'media_player.a, media_player.b' });
    expect(buildServiceCall(cfg, 'hello')).toEqual({
      path: '/api/services/tts/speak',
      body: { entity_id: 'tts.google_en_com', media_player_entity_id: ['media_player.a', 'media_player.b'], message: 'hello', cache: false },
    });
  });

  it('rejects empty messages and incomplete config', () => {
    expect(buildServiceCall(readConfig({}), '   ')).toBeTypeOf('string');
    expect(buildServiceCall(readConfig({ scriptEntity: 'light.kitchen' }), 'x')).toBeTypeOf('string');
    expect(buildServiceCall(readConfig({ mode: 'tts', ttsEntity: 'tts.x' }), 'x')).toBeTypeOf('string');
  });
});

describe('list parsing', () => {
  it('splits presets by line and speakers by comma or line', () => {
    expect(parsePresets('a\n\n b \n')).toEqual(['a', 'b']);
    expect(splitList('x, y\nz,')).toEqual(['x', 'y', 'z']);
  });
});
