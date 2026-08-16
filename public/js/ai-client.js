/**
 * PUX PILOT — AI Network Client & Resilient Fallback Coordinator
 * Proxies calls to /api/ai/* endpoints (Groq -> OpenRouter -> Gemini) with automatic local fallback.
 */

class AIClient {
  constructor() {
    this.isOnline = true;
    this.lastProvider = 'rule-engine';
    this.checkHealth();
  }

  async checkHealth() {
    try {
      const res = await fetch('/api/knowledge', { signal: AbortSignal.timeout(3000) });
      this.isOnline = res.ok;
    } catch (e) {
      this.isOnline = false;
    }
    this.updateStatusBadge();
  }

  updateStatusBadge(provider = null) {
    const badge = document.getElementById('ai-status-badge');
    if (!badge) return;

    if (provider && provider !== 'rule-engine') {
      badge.className = 'status-badge online';
      badge.innerHTML = `<span class="status-dot"></span> AI Active (${provider.toUpperCase()})`;
    } else if (this.isOnline) {
      badge.className = 'status-badge connected';
      badge.innerHTML = `<span class="status-dot"></span> Rules + AI Ready`;
    } else {
      badge.className = 'status-badge offline';
      badge.innerHTML = `<span class="status-dot"></span> Offline (Rule Engine)`;
    }
  }

  /**
   * 1. Conversational Co-Pilot Chat
   */
  async sendChat(message, stateObject, personality = 'friendly', roastLevel = 3) {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stateObject, personality, roastLevel }),
        // The chat must feel instant. If the hosted AI is slow, use Friddyy's
        // local reply rather than leaving the user without an answer.
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const data = await res.json();
        this.updateStatusBadge(data.provider);
        return data;
      }
    } catch (e) {
      console.warn('Chat API unavailable, generating local rule fallback:', e.message);
    }

    // Local rule fallback
    return {
      reply: this.generateLocalChatFallback(message, stateObject, personality, roastLevel),
      personality,
      provider: 'rule-engine',
      fallback: true,
      offline: true
    };
  }

  generateLocalChatFallback(message, stateObject, personality, roastLevel) {
    const lower = (message || '').toLowerCase();
    if (/\b(hi|hello|hey|hii)\b/.test(lower)) {
      return 'Hii! I’m Friddyy ✨ Show me what you changed, ask for a glow-up, or dare me to roast it. 😄';
    }
    if (lower.includes('make it weird') || lower.includes('chaos')) {
      return '⚡🌀 WEIRD MODE ENGAGED! Inverting chromatic matrix, deploying hyper-saturation, and embracing high-voltage creative entropy! 👾🎨';
    }
    if (lower.includes('composition') || lower.includes('crop')) {
      return 'For stronger composition, consider aligning your primary hero along the 1/3 grid lines and using a gentle vignette to center the eye!';
    }
    if (lower.includes('color') || lower.includes('palette')) {
      return 'Your color palette is forming nicely. Try balancing high saturation with clean neutral backgrounds for editorial clarity.';
    }
    if (lower.includes('text') || lower.includes('typography')) {
      return 'Make sure your text has at least a 10% safety margin from canvas edges and strong contrast against the underlying image!';
    }

    if (personality === 'roast') {
      return `Level ${roastLevel} Roast: That edit is so avant-garde even the undo button is getting nervous. Adjust that contrast before I call the design police! 😉`;
    } else if (personality === 'mentor') {
      return 'Observation: The current dynamic range is balanced. Consider refining your typographic hierarchy and margin spacing.';
    } else if (personality === 'chaos') {
      return 'WHY BE BALANCED WHEN YOU CAN BE ICONIC? Crank the tint, slap three stickers, and let the chaos reign! 🚀💥';
    } else {
      return 'Ooh, I see the vibe! Try one bold slider move, then ask me to roast it or make it more cinematic. ✨';
    }
  }

  /**
   * 2. Design Scorecard Analysis
   */
  async analyzeDesign(stateObject, personality = 'mentor') {
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateObject, personality }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        this.updateStatusBadge(data.provider);
        return data;
      }
    } catch (e) {
      console.warn('Analyze API unavailable, generating local scorecard fallback:', e.message);
    }

    // Local rule fallback scorecard
    const adj = stateObject?.adjustments || {};
    const sat = adj.saturation || 0;
    const con = adj.contrast || 0;
    const bri = adj.brightness || 0;
    const textLayers = (stateObject?.layers || []).filter(l => l.type === 'text');

    const comp = 82;
    const color = Math.max(30, Math.min(95, 85 - (sat > 60 ? 25 : 0)));
    const contrast = Math.max(30, Math.min(95, 85 - (con < -10 ? 25 : 0) - (bri < -30 ? 20 : 0)));
    const type = textLayers.length > 0 ? 88 : 75;
    const hier = 84;
    const overall = Math.round((comp + color + contrast + type + hier) / 5);

    return {
      scores: {
        composition: comp,
        colorHarmony: color,
        contrast: contrast,
        typography: type,
        visualHierarchy: hier
      },
      overall,
      feedback: {
        working: 'Solid tonal foundation with crisp base resolution.',
        improve: 'Dynamic range and negative space could be accentuated.',
        recommendation: 'Fine-tune contrast +15 and test subtle vignetting.'
      },
      provider: 'rule-engine',
      offline: true
    };
  }

  /**
   * 3. Make It Better
   */
  async makeItBetter(stateObject) {
    try {
      const res = await fetch('/api/ai/make-it-better', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateObject }),
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const data = await res.json();
        this.updateStatusBadge(data.provider);
        return data.suggestions || [];
      }
    } catch (e) {
      console.warn('Make-It-Better API unavailable, generating local suggestions:', e.message);
    }

    const adj = stateObject?.adjustments || {};
    const suggestions = [];

    if ((adj.contrast || 0) < 15) {
      suggestions.push({
        type: 'adjustment',
        param: 'contrast',
        from: adj.contrast || 0,
        to: (adj.contrast || 0) + 18,
        label: 'Boost contrast +18 for punchy depth and rich blacks'
      });
    }

    if ((adj.vignette || 0) < 10) {
      suggestions.push({
        type: 'adjustment',
        param: 'vignette',
        from: adj.vignette || 0,
        to: 24,
        label: 'Apply subtle vignette (24%) to frame the focal subject'
      });
    }

    suggestions.push({
      type: 'adjustment',
      param: 'sharpness',
      from: adj.sharpness || 0,
      to: 22,
      label: 'Add micro-sharpness (+22) for crisp retina display rendering'
    });

    return suggestions;
  }

  /**
   * 4. Challenges
   */
  async getChallenge() {
    try {
      const res = await fetch('/api/ai/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        return data.challenge;
      }
    } catch (e) {}

    // Fallback challenge
    return {
      id: 'cyberpunk_noir',
      title: 'Cyberpunk Noir',
      description: 'Create a high-energy futuristic composition using cool tones, strong contrast, and at least one text badge.',
      difficulty: 'Medium',
      xp: 150,
      requirements: [
        { id: 'req_contrast', text: 'Contrast >= +25' },
        { id: 'req_temp', text: 'Cool Temperature (<= -15)' },
        { id: 'req_layers', text: 'At least 2 layers (Text or Shape)' }
      ]
    };
  }

  async checkChallenge(challengeId, stateObject) {
    try {
      const res = await fetch('/api/ai/check-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, stateObject })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Fallback checker
    const adj = stateObject?.adjustments || {};
    const layers = stateObject?.layers || [];
    const r1 = (adj.contrast || 0) >= 25;
    const r2 = (adj.temperature || 0) <= -15;
    const r3 = layers.length >= 2;
    const passedCount = (r1 ? 1 : 0) + (r2 ? 1 : 0) + (r3 ? 1 : 0);
    const completed = passedCount === 3;

    return {
      challengeId,
      title: 'Cyberpunk Noir',
      completed,
      score: Math.round((passedCount / 3) * 100),
      passedCount,
      totalCount: 3,
      requirements: [
        { id: 'req_contrast', text: 'Contrast >= +25', passed: r1 },
        { id: 'req_temp', text: 'Cool Temperature (<= -15)', passed: r2 },
        { id: 'req_layers', text: 'At least 2 layers (Text or Shape)', passed: r3 }
      ],
      feedback: completed ? '🎉 Outstanding! You mastered the challenge requirements!' : `You satisfied ${passedCount}/3 requirements.`,
      xpEarned: completed ? 150 : 50
    };
  }

  async logFeedback(action, item) {
    try {
      await fetch('/api/feedback/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...item })
      });
    } catch (e) {}
  }

  /**
   * 5. Match This Vibe (Style Matching)
   */
  async matchStyle(targetImage, referenceImage, extractedStats) {
    try {
      const res = await fetch('/api/ai/match-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetImage, referenceImage, extractedStats }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        this.updateStatusBadge(data.provider);
        return data;
      }
    } catch (e) {
      console.warn('Match Style API unavailable, computing local quantitative recipe:', e.message);
    }

    // Local quantitative fallback recipe
    const ref = extractedStats.reference || {};
    const tgt = extractedStats.target || {};

    const lumDelta = (ref.lightness !== undefined && tgt.lightness !== undefined) ? Math.round((ref.lightness - tgt.lightness) * 0.7) : 0;
    const satDelta = (ref.saturation !== undefined && tgt.saturation !== undefined) ? Math.round((ref.saturation - tgt.saturation) * 0.8) : 15;
    const tempDelta = (ref.temperature !== undefined && tgt.temperature !== undefined) ? Math.round((ref.temperature - tgt.temperature) * 0.9) : 20;
    const tintDelta = (ref.tint !== undefined && tgt.tint !== undefined) ? Math.round((ref.tint - tgt.tint) * 0.8) : 0;
    const conDelta = (ref.contrast !== undefined && tgt.contrast !== undefined) ? Math.round((ref.contrast - tgt.contrast) * 0.75) : 18;

    return {
      recipe: {
        brightness: Math.max(-50, Math.min(50, lumDelta)),
        contrast: Math.max(-50, Math.min(60, conDelta)),
        saturation: Math.max(-60, Math.min(60, satDelta)),
        exposure: Math.max(-40, Math.min(40, Math.round(lumDelta * 0.5))),
        temperature: Math.max(-70, Math.min(70, tempDelta)),
        tint: Math.max(-50, Math.min(50, tintDelta)),
        vignette: Math.max(0, Math.min(70, ref.vignette || 20)),
        sharpness: 18
      },
      explanation: `Vibe matched via offline quantitative analysis. Color temperature shifted (${tempDelta > 0 ? '+' : ''}${tempDelta}) and contrast balanced (${conDelta > 0 ? '+' : ''}${conDelta}) to mimic the reference mood.`,
      provider: 'rule-engine-local',
      fallback: true
    };
  }
}

window.AIClient = AIClient;
