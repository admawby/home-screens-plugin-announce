# Announce: a Home Screens plugin

Type a message on your [Home Screens](https://homescreens.dev) display and Home Assistant speaks it on your speakers. You can also tap a preset to announce it straight away.

The Home Assistant plugin's buttons can only send fixed data, so they can't take a message you type. This plugin fills that gap.

## Two ways to announce

- **Run a script** (default). The plugin calls `script.turn_on` on a script you choose and passes the message in a field you name (`message` by default). This reuses whatever announcement script you already have, including its speakers, TTS engine, volume and chimes. An example script is below.
- **Call `tts.speak` directly.** Pick a TTS entity and one or more speakers. You don't need a script.

## Setup

1. Install the plugin.
2. In the plugin's settings, set the **Home Assistant URL**. If you leave it empty, the plugin uses the URL from the official Home Assistant plugin.
3. Add a **Long-Lived Access Token** under the module's secrets. Create one in Home Assistant at Profile → Security.
4. Add the **Announce** module to a screen and set it up:
   - which script or TTS entity to use
   - your preset messages, one per line
   - whether to show the text box

The plugin needs the `localNetwork` permission so the hub's proxy can reach a Home Assistant on your LAN.

### Example script

```yaml
alias: Announcement
mode: single
fields:
  message:
    name: Message
    required: true
    selector:
      text: {}
sequence:
  - action: tts.speak
    target:
      entity_id: tts.google_en_com
    data:
      media_player_entity_id: media_player.kitchen_speaker
      message: "{{ message }}"
      cache: false
```

## Development

```bash
npm install
npm test          # unit tests for the service-call builder
npm run build     # dist/bundle.js
npm run package   # ha-announce.tar.gz, ready for "Install from URL"
```

Built from the official [plugin template](https://github.com/home-screens/home-screens-plugin-template).

## License

MIT
