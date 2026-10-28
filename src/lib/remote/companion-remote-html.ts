/**
 * Self-contained HTML/CSS/JS mobile companion remote served at /remote.
 * Works instantly on any iPhone, iPad, Android phone, or tablet browser on the local Wi-Fi.
 */

export function renderCompanionRemoteHtml(appVersion: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#08090b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Argus Remote</title>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
    :root {
      --bg: #090a0f;
      --card: rgba(22, 25, 35, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.35);
      --text: #f3f4f6;
      --subtext: #9ca3af;
      --btn-active: rgba(255, 255, 255, 0.12);
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      user-select: none;
      touch-action: manipulation;
    }
    .container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 24px;
    }
    /* Header & Now Playing */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
    }
    .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: #fff; display: flex; align-items: center; gap: 8px; }
    .brand span { color: var(--accent); }
    .status-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent);
      border: 1px solid var(--accent-glow);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .now-playing-card {
      background: var(--card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .np-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .np-sub { font-size: 12px; color: var(--subtext); display: flex; justify-content: space-between; }
    .progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.3s; }

    /* D-PAD */
    .dpad-container {
      width: 250px;
      height: 250px;
      margin: 10px auto;
      position: relative;
      background: radial-gradient(circle, rgba(30,35,50,0.8) 0%, rgba(15,18,26,0.95) 100%);
      border-radius: 50%;
      border: 1px solid var(--card-border);
      box-shadow: 0 12px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dpad-btn {
      position: absolute;
      background: transparent;
      border: none;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.1s;
    }
    .dpad-btn:active { color: var(--accent); transform: scale(0.92); }
    .dpad-up { top: 12px; left: 85px; width: 80px; height: 60px; }
    .dpad-down { bottom: 12px; left: 85px; width: 80px; height: 60px; }
    .dpad-left { left: 12px; top: 85px; width: 60px; height: 80px; }
    .dpad-right { right: 12px; top: 85px; width: 60px; height: 80px; }
    .dpad-center {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .dpad-center:active { background: var(--accent); color: #000; transform: scale(0.92); }

    /* Action Buttons Grid */
    .btn-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .action-btn {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px 6px;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.12s;
    }
    .action-btn:active { background: var(--btn-active); transform: scale(0.95); }
    .action-btn svg { width: 18px; height: 18px; fill: currentColor; }

    /* Search & Direct Send */
    .input-box {
      display: flex;
      gap: 8px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 6px 10px;
      align-items: center;
    }
    .input-box input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 13.5px;
    }
    .input-box button {
      background: var(--accent);
      color: #000;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
    }
    .input-box button:active { opacity: 0.85; transform: scale(0.96); }

    /* Volume control slider */
    .vol-control {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 10px 14px;
    }
    .vol-control input[type=range] {
      flex: 1;
      accent-color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">ARGUS <span>REMOTE</span> <span style="font-size:11px; opacity:0.6; font-weight:500;">v${appVersion}</span></div>
      <div id="statusBadge" class="status-pill">Connected</div>
    </div>

    <!-- Now Playing Status -->
    <div class="now-playing-card">
      <div id="mediaTitle" class="np-title">Argus TV & Entertainment</div>
      <div class="np-sub">
        <span id="mediaProfile">Default Profile</span>
        <span id="mediaTiming">00:00 / 00:00</span>
      </div>
      <div class="progress-bar">
        <div id="progressBar" class="progress-fill"></div>
      </div>
    </div>

    <!-- Navigation D-Pad -->
    <div class="dpad-container">
      <button class="dpad-btn dpad-up" onclick="sendKey('ArrowUp')">▲</button>
      <button class="dpad-btn dpad-down" onclick="sendKey('ArrowDown')">▼</button>
      <button class="dpad-btn dpad-left" onclick="sendKey('ArrowLeft')">◀</button>
      <button class="dpad-btn dpad-right" onclick="sendKey('ArrowRight')">▶</button>
      <button class="dpad-center" onclick="sendKey('Enter')">OK</button>
    </div>

    <!-- Navigation Actions -->
    <div class="btn-row">
      <button class="action-btn" onclick="sendKey('Backspace')">
        <span>⮌</span> Back
      </button>
      <button class="action-btn" onclick="sendKey('Escape')">
        <span>⌂</span> Home
      </button>
      <button class="action-btn" onclick="sendKey('s')">
        <span>💬</span> Subs
      </button>
      <button class="action-btn" onclick="sendKey('a')">
        <span>🔊</span> Audio
      </button>
    </div>

    <!-- Playback Transport -->
    <div class="btn-row">
      <button class="action-btn" onclick="sendKey('j')">
        <span>⏪</span> -10s
      </button>
      <button class="action-btn" style="background: rgba(16,185,129,0.18); color: var(--accent);" onclick="sendKey(' ')">
        <span>⏯</span> Play
      </button>
      <button class="action-btn" onclick="sendKey('l')">
        <span>⏩</span> +10s
      </button>
      <button class="action-btn" onclick="sendKey('f')">
        <span>⛶</span> Full
      </button>
    </div>

    <!-- Volume & Mute -->
    <div class="vol-control">
      <span onclick="sendKey('m')" style="cursor: pointer;">🔈</span>
      <input type="range" min="0" max="100" value="80" id="volSlider" oninput="setVol(this.value)">
      <span onclick="sendKey('m')" style="cursor: pointer;">🔊</span>
    </div>

    <!-- Quick Search & Stream Launcher -->
    <div class="input-box">
      <input type="text" id="searchInput" placeholder="Search title or paste IMDb/stream..." onkeydown="if(event.key==='Enter') sendText()">
      <button onclick="sendText()">SEND</button>
    </div>
  </div>

  <script>
    function haptic() {
      if ('vibrate' in navigator) navigator.vibrate(12);
    }

    async function sendKey(key) {
      haptic();
      try {
        await fetch('/api/v1/remote/key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
      } catch (e) {
        console.error('Remote key error:', e);
      }
    }

    async function setVol(val) {
      try {
        await fetch('/api/v1/remote/key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'SetVolume', value: Number(val) / 100 })
        });
      } catch (e) {}
    }

    async function sendText() {
      haptic();
      const input = document.getElementById('searchInput');
      const text = input.value.trim();
      if (!text) return;
      try {
        await fetch('/api/v1/remote/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        input.value = '';
      } catch (e) {
        alert('Could not dispatch search to TV.');
      }
    }

    async function updateStatus() {
      try {
        const res = await fetch('/api/v1/status');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('statusBadge').innerText = data.bigPicture ? 'TV Mode' : 'Connected';
        document.getElementById('mediaProfile').innerText = data.profile?.name || 'Default';
      } catch (e) {}
    }

    setInterval(updateStatus, 3000);
    updateStatus();
  </script>
</body>
</html>`;
}
