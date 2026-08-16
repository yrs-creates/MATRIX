/**
 * PUX PILOT — Gamification, Sound Engine & Localized Confetti
 * Manages XP, Level Progression, 12 Unlockable Badges, Web Audio Synth Cues, and Co-Pilot Confetti.
 */

class GamificationEngine {
  constructor() {
    this.xp = 0;
    this.level = 1;
    this.soundEnabled = true;
    this.audioCtx = null;

    this.levelTitles = [
      'Novice Pilot',
      'Visual Navigator',
      'Color Alchemist',
      'Layout Strategist',
      'Creative Director',
      'Design Wizard',
      'Pixel Maestro',
      'Aesthetic Overlord',
      'Vibe Sovereign',
      'Grandmaster Ace'
    ];

    this.achievements = [
      { id: 'genius_math', title: 'Math Genius', icon: '🧠', desc: 'Cracked 2+2 on the first try like a true prodigy', unlocked: false },
      { id: 'first_flight', title: 'First Flight', icon: '🚀', desc: 'Loaded your first image or made an initial canvas edit', unlocked: false },
      { id: 'color_alchemist', title: 'Color Alchemist', icon: '🎨', desc: 'Explored temperature, tint, and saturation adjustments', unlocked: false },
      { id: 'contrast_commander', title: 'Contrast Commander', icon: '⚡', desc: 'Balanced dynamic range and exposure levels', unlocked: false },
      { id: 'type_titan', title: 'Type Titan', icon: '✍️', desc: 'Created and customized a typography layer', unlocked: false },
      { id: 'filter_fanatic', title: 'Filter Fanatic', icon: '🎞️', desc: 'Sampled 3+ aesthetic canvas filters', unlocked: false },
      { id: 'chaos_master', title: 'Chaos Master', icon: '👾', desc: 'Triggered Chaos mode or the "make it weird" easter egg', unlocked: false },
      { id: 'perfectionist', title: 'Perfectionist', icon: '🔄', desc: 'Used undo/redo history to refine your work', unlocked: false },
      { id: 'ai_collaborator', title: 'AI Collaborator', icon: '🤖', desc: 'Applied a "Make It Better" automated suggestion', unlocked: false },
      { id: 'challenge_champion', title: 'Challenge Champion', icon: '🏆', desc: 'Successfully completed a creative constraint challenge', unlocked: false },
      { id: 'layer_architect', title: 'Layer Architect', icon: '🥞', desc: 'Stacked 3+ non-destructive layers on canvas', unlocked: false },
      { id: 'master_export', title: 'Master Export', icon: '💾', desc: 'Rendered and exported a high-res design', unlocked: false }
    ];

    this.loadState();
    this.initConfetti();
  }

  loadState() {
    try {
      const savedXp = localStorage.getItem('pux_pilot_xp');
      if (savedXp) this.xp = parseInt(savedXp, 10) || 0;

      const savedSound = localStorage.getItem('pux_pilot_sound');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedBadges = localStorage.getItem('pux_pilot_badges');
      if (savedBadges) {
        const unlockedIds = JSON.parse(savedBadges);
        this.achievements.forEach(a => {
          if (unlockedIds.includes(a.id)) a.unlocked = true;
        });
      }
    } catch (e) {
      console.warn('Could not load gamification state from localStorage:', e);
    }
    this.calculateLevel();
  }

  saveState() {
    try {
      localStorage.setItem('pux_pilot_xp', this.xp.toString());
      localStorage.setItem('pux_pilot_sound', this.soundEnabled.toString());
      const unlockedIds = this.achievements.filter(a => a.unlocked).map(a => a.id);
      localStorage.setItem('pux_pilot_badges', JSON.stringify(unlockedIds));
    } catch (e) {}
  }

  calculateLevel() {
    // 0-100: Lv1, 101-250: Lv2, 251-450: Lv3, etc.
    const thresholds = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
    let lvl = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.xp >= thresholds[i]) {
        lvl = i + 1;
        break;
      }
    }
    this.level = Math.min(10, lvl);
    return this.level;
  }

  getLevelProgress() {
    const thresholds = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 5000];
    const currentBase = thresholds[this.level - 1] || 0;
    const nextTarget = thresholds[this.level] || (currentBase + 1000);
    const progressXP = this.xp - currentBase;
    const neededXP = nextTarget - currentBase;
    const pct = Math.min(100, Math.max(0, Math.round((progressXP / neededXP) * 100)));
    return {
      currentXP: this.xp,
      level: this.level,
      title: this.levelTitles[this.level - 1] || 'Design Ace',
      pct,
      nextTarget
    };
  }

  addXP(amount, reason = '') {
    if (amount <= 0) return;
    const oldLevel = this.level;
    this.xp += amount;
    this.calculateLevel();
    this.saveState();

    this.showXPToast(amount, reason);
    this.playSound('xp');

    if (this.level > oldLevel) {
      this.handleLevelUp(this.level);
    }
    this.updateUI();
  }

  unlockAchievement(badgeId) {
    const badge = this.achievements.find(a => a.id === badgeId);
    if (!badge || badge.unlocked) return;

    badge.unlocked = true;
    this.saveState();

    // Sound & Confetti
    this.playSound('badge');
    this.triggerLocalConfetti();

    // Notify UI & Mascot
    window.dispatchEvent(new CustomEvent('pux:badge-unlocked', { detail: badge }));
    this.addXP(50, `Badge: ${badge.title}`);
    this.updateUI();
  }

  handleLevelUp(newLevel) {
    this.playSound('levelup');
    this.triggerLocalConfetti();
    const title = this.levelTitles[newLevel - 1] || 'Design Ace';
    window.dispatchEvent(new CustomEvent('pux:level-up', { detail: { level: newLevel, title } }));
  }

  showXPToast(amount, reason = '') {
    const container = document.getElementById('copilot-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'xp-toast animate-slide-up';
    toast.innerHTML = `
      <span class="xp-sparkle">✨</span>
      <span class="xp-amount">+${amount} XP</span>
      ${reason ? `<span class="xp-reason">${reason}</span>` : ''}
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  updateUI() {
    const progress = this.getLevelProgress();

    const xpText = document.getElementById('user-xp-display');
    if (xpText) xpText.textContent = `${progress.currentXP} XP`;

    const lvlText = document.getElementById('user-level-badge');
    if (lvlText) lvlText.textContent = `Lv.${progress.level}`;

    const titleText = document.getElementById('user-level-title');
    if (titleText) titleText.textContent = progress.title;

    const bar = document.getElementById('user-xp-fill');
    if (bar) bar.style.width = `${progress.pct}%`;

    // Render Badge Tray
    const tray = document.getElementById('achievements-tray');
    if (tray) {
      tray.innerHTML = this.achievements.map(a => `
        <div class="badge-pill ${a.unlocked ? 'unlocked' : 'locked'}" title="${a.title}: ${a.desc}">
          <span class="badge-icon">${a.icon}</span>
          <span class="badge-title">${a.title}</span>
        </div>
      `).join('');
    }
  }

  /* ==========================================================================
     LOCALIZED CO-PILOT CONFETTI (Confined strictly to right panel)
     ========================================================================== */

  initConfetti() {
    this.confettiCanvas = document.getElementById('copilot-confetti-canvas');
    if (!this.confettiCanvas) return;
    this.cCtx = this.confettiCanvas.getContext('2d');
    this.particles = [];
    this.isConfettiActive = false;

    const resizeConfetti = () => {
      const parent = this.confettiCanvas.parentElement;
      if (parent) {
        this.confettiCanvas.width = parent.clientWidth;
        this.confettiCanvas.height = parent.clientHeight;
      }
    };
    resizeConfetti();
    window.addEventListener('resize', resizeConfetti);
  }

  triggerLocalConfetti() {
    if (!this.confettiCanvas || !this.cCtx) return;
    const colors = ['#8b5cf6', '#22d3ee', '#f43f5e', '#f59e0b', '#10b981', '#ffffff'];
    const count = 45;
    const w = this.confettiCanvas.width || 320;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: w / 2 + (Math.random() * 80 - 40),
        y: 80,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        life: 1
      });
    }

    if (!this.isConfettiActive) {
      this.isConfettiActive = true;
      this.renderConfetti();
    }
  }

  renderConfetti() {
    if (!this.cCtx || !this.confettiCanvas) return;
    const ctx = this.cCtx;
    ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.rotation += p.rotationSpeed;
      p.life -= 0.015;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0 || p.y > this.confettiCanvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.renderConfetti());
    } else {
      this.isConfettiActive = false;
      ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }

  /* ==========================================================================
     SYNTHESIZED WEB AUDIO SOUND ENGINE
     ========================================================================== */

  initAudio() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'flinch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'xp') {
        const freqs = [523.25, 659.25]; // C5, E5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);
          gain.gain.setValueAtTime(0.1, now + idx * 0.07);
          gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.15);
        });
      } else if (type === 'badge' || type === 'levelup') {
        const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          gain.gain.setValueAtTime(0.15, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.28);
        });
      }
    } catch (e) {}
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.saveState();
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      btn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
      btn.title = this.soundEnabled ? 'Sound FX Enabled' : 'Sound FX Muted';
    }
    if (this.soundEnabled) this.playSound('click');
    return this.soundEnabled;
  }
}

window.GamificationEngine = GamificationEngine;
