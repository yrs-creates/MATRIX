/**
 * PUX PILOT — Real-Time Offline Rule Engine
 * Evaluates design triggers instantly against canvas state without requiring network requests.
 * Phrasings are customized by personality (Friendly / Mentor / Roast 1-5 / Chaos).
 */

class DesignRuleEngine {
  constructor() {
    this.knowledge = null;
    this.firedRuleCooldowns = new Map(); // Prevents spamming same rule within short window
    this.lastEvaluatedState = null;

    this.initKnowledge();
  }

  async initKnowledge() {
    // Try fetching from server API; if standalone/offline, use embedded fallback
    try {
      const res = await fetch('/api/knowledge');
      if (res.ok) {
        const data = await res.json();
        this.knowledge = data.knowledge;
      }
    } catch (e) {
      console.log('Running rules engine in standalone offline mode with embedded knowledge.');
    }

    if (!this.knowledge) {
      this.knowledge = this.getEmbeddedKnowledge();
    }
  }

  getEmbeddedKnowledge() {
    return {
      colorTheory: {
        commonMistakes: [
          {
            id: 'color_competing_saturation',
            trigger: s => (s.adjustments?.saturation || 0) > 75 && (s.layers?.length || 0) > 2,
            targetSelector: '#slider-saturation',
            issue: 'Multiple saturated elements are competing for attention.',
            fix: 'Drop background saturation to neutral to let the hero pop.',
            friendly: 'Super punchy colors! 🎨 To make your main subject stand out even more, try pulling back the saturation slider slightly.',
            mentor: 'Notice how the high saturation across multiple layers causes chromatic competition. Reduce secondary saturation by 25% for tonal depth.',
            roast: level => level >= 4 ? 'My retinas just filed a lawsuit. Turn down that saturation slider before you burn a hole in my screen! 🔥' : 'Whoa there, neon enthusiast. Ease off the saturation before this turns into a laser tag arena.',
            chaos: 'MAXIMUM SATURATION DETECTED! Can we make it even more radioactive?! 🌈⚡'
          },
          {
            id: 'color_heavy_tint',
            trigger: s => Math.abs(s.adjustments?.tint || 0) > 40,
            targetSelector: '#slider-tint',
            issue: 'Heavy tint creates an unnatural color cast.',
            fix: 'Recenter the tint slider closer to 0.',
            friendly: 'The tint is giving a dramatic mood! ✨ If skin tones look a bit green/pink, nudge the tint back toward center.',
            mentor: 'Extreme tint shifts distort white balance calibration. Recenter tint to [-10, +10] to maintain natural chromatic fidelity.',
            roast: level => 'Did an alien invasion happen or is your tint slider just broken? Recenter that slider! 👽',
            chaos: 'PURE ALIEN CYBERPUNK ENERGY! The tint matrix is vibrating! 🧪'
          },
          {
            id: 'color_extreme_temperature',
            trigger: s => (s.adjustments?.temperature || 0) > 55 || (s.adjustments?.temperature || 0) < -55,
            targetSelector: '#slider-temperature',
            issue: 'Extreme temperature is flattening midtones.',
            fix: 'Soften temperature toward neutral (-20 to +20).',
            friendly: 'Bold temperature choice! ❄️🔥 Softening it just a touch will bring out rich textures in the shadows.',
            mentor: 'Extreme kelvin simulation clips the color gamut. Recenter temperature to preserve subtle chromatic nuance.',
            roast: level => 'Are we on the surface of the sun or Antarctica? Bring the temperature slider back to Earth. 🌡️',
            chaos: 'FREEZING COLD OR BLISTERING HEAT — EMBRACE THE ELEMENTAL CHAOS! 🌋'
          }
        ]
      },
      typography: {
        commonMistakes: [
          {
            id: 'typography_edge_crowding',
            trigger: s => (s.layers || []).some(l => l.type === 'text' && (l.x < 0.06 || l.x > 0.94 || l.y < 0.06 || l.y > 0.94)),
            targetSelector: '#tool-tab-text',
            issue: 'Text is crowded close to the canvas edge (<6% margin).',
            fix: 'Add at least 10% margin padding from boundaries.',
            friendly: 'Nice typography! ✍️ Try pulling your text inward a bit from the edge so it has comfortable room to breathe.',
            mentor: 'Typographic hierarchy requires sufficient safe margin (>8%). Edge crowding creates uncomfortable visual tension.',
            roast: level => 'Your text is clinging to the border like it is terrified of the canvas. Give it some breathing room! 📐',
            chaos: 'PUSH THAT TEXT OFF THE CLIFF! Or center it right in the eye of the storm! 🌪️'
          },
          {
            id: 'typography_poor_contrast',
            trigger: s => (s.layers || []).some(l => l.type === 'text' && !l.strokeColor && !l.shadowColor && Math.abs(s.adjustments?.brightness || 0) < 15),
            targetSelector: '#tool-tab-text',
            issue: 'Text has low luminance contrast against the image.',
            fix: 'Add text outline stroke or a subtle drop shadow.',
            friendly: 'Want your headline to pop effortlessly? Try toggling on the text shadow or outline! ✨',
            mentor: 'Text legibility falls below recommended WCAG 4.5:1 luminance ratio. Add a text shadow or outline stroke.',
            roast: level => 'I need binoculars to read that text. Slap a shadow or outline on it before your audience squints to death. 👀',
            chaos: 'CLOAKED STEALTH TEXT! Add neon outlines to make it glow like a cyber sign! 💡'
          }
        ]
      },
      contrast: {
        commonMistakes: [
          {
            id: 'contrast_flat_washed_out',
            trigger: s => (s.adjustments?.contrast || 0) < -25 || ((s.adjustments?.brightness || 0) > 30 && (s.adjustments?.contrast || 0) < -5),
            targetSelector: '#slider-contrast',
            issue: 'Low contrast paired with high brightness washes out tonal depth.',
            fix: 'Boost contrast to +15-30 to anchor deep blacks.',
            friendly: 'Image looking a little soft and dreamy! ☁️ Boosting contrast +20 will make those details snap into focus!',
            mentor: 'The dynamic tonal range is compressed in the midtones. Increase contrast to establish a clear black point.',
            roast: level => 'Did you apply a fog machine filter? Turn up the contrast so we can actually see the image! 🌫️',
            chaos: 'FOGGY VOID DETECTED! Crank the contrast to 100 or plunge into the white mist! ☁️'
          },
          {
            id: 'contrast_crushed_shadows',
            trigger: s => (s.adjustments?.brightness || 0) < -35 && ((s.adjustments?.contrast || 0) > 30 || (s.adjustments?.vignette || 0) > 50),
            targetSelector: '#slider-brightness',
            issue: 'Excessive darkening is crushing shadow details.',
            fix: 'Lift brightness to -10 or ease off the vignette.',
            friendly: 'Ooh, moody noir vibes! 🖤 If the shadows feel a bit too dark, lifting brightness slightly will recover nice textures.',
            mentor: 'Shadow histogram is clipping at zero luminance. Increase brightness or reduce vignette to preserve low-key fidelity.',
            roast: level => 'Your shadows are so crushed Batman is moving into them. Lift the brightness! 🦇',
            chaos: 'BLACK HOLE CANVAS! The pixels are collapsing under infinite gravity! 🕳️'
          },
          {
            id: 'contrast_blown_highlights',
            trigger: s => (s.adjustments?.exposure || 0) > 40 || ((s.adjustments?.brightness || 0) > 40 && (s.adjustments?.contrast || 0) > 35),
            targetSelector: '#slider-exposure',
            issue: 'Overblown highlights are clipping bright textures.',
            fix: 'Dial exposure down by 20 points.',
            friendly: 'Bright and energetic! ☀️ Pulling exposure back slightly will restore clean highlights in the bright areas.',
            mentor: 'Highlight clipping detected in the upper quartile. Reduce exposure by 15-20 units to maintain dynamic range.',
            roast: level => 'I feel like I am staring into the high beams of a semi-truck. Lower the exposure! 💡',
            chaos: 'SUPERNOVA BLAST! Let the pure white photons illuminate the cosmos! 💥'
          }
        ]
      },
      lightingAndMood: {
        commonMistakes: [
          {
            id: 'lighting_excessive_vignette',
            trigger: s => (s.adjustments?.vignette || 0) > 75,
            targetSelector: '#slider-vignette',
            issue: 'Heavy vignette creates artificial tunnel vision.',
            fix: 'Lower vignette to 20-35% for natural falloff.',
            friendly: 'Nice focal framing! 🎯 Lowering the vignette to around 30% gives a super polished, subtle cinema look.',
            mentor: 'Aggressive vignetting (>75%) creates an abrupt radial gradient mask. Reduce to 25-35% for authentic optical vignetting.',
            roast: level => 'Are we looking through a spy telescope? Tone down that vignette border. 🔭',
            chaos: 'TUNNEL OF TIME AND SPACE! We are voyaging into the vortex! 🌀'
          },
          {
            id: 'lighting_over_sharpening',
            trigger: s => (s.adjustments?.sharpness || 0) > 70,
            targetSelector: '#slider-sharpness',
            issue: 'High sharpness produces jagged pixel halos.',
            fix: 'Reduce sharpness to 25-40% for natural crispness.',
            friendly: 'Super crisp! 🔪 Dialing sharpness back to ~30% keeps it looking sharp without any digital grain.',
            mentor: 'High-pass convolution at this magnitude induces ringing artifacts along high-frequency edges. Reduce sharpness to 30-40%.',
            roast: level => 'I could slice bread with these jagged pixels. Dial down the sharpness slider! 🍞',
            chaos: 'CRUNCHY 8K QUANTUM PIXELS! Every edge is a razor blade! ⚡'
          }
        ]
      },
      compositingAndStyle: {
        commonMistakes: [
          {
            id: 'compositing_floating_person',
            trigger: s => (s.layers || []).some(l => l.type === 'person' && (!l.shadow || !l.shadow.enabled)),
            targetSelector: '#tool-tab-people',
            issue: 'Inserted person layer has no contact shadow, making them appear floating.',
            fix: 'Enable directional contact shadow in the Add People panel to anchor them into the scene.',
            friendly: 'Great placement! 👤 To make it look 100% natural, toggle on the soft contact shadow underneath!',
            mentor: 'Photographic compositing requires contact ambient occlusion. Add a soft drop shadow matching the scene light direction.',
            roast: level => 'That person is floating like they have an invisible jetpack. Give them a contact shadow before they fly away! 🛸',
            chaos: 'GRAVITY IS OPTIONAL IN THE CHAOS DIMENSION! But a glowing shadow would look epic! ⚡'
          },
          {
            id: 'compositing_lighting_mismatch',
            trigger: s => (s.layers || []).some(l => l.type === 'person' && (!l.harmonize || !l.harmonize.enabled) && Math.abs(s.adjustments?.temperature || 0) > 25),
            targetSelector: '#tool-tab-people',
            issue: 'Person lighting tone is detached from the ambient scene color grade.',
            fix: 'Toggle Auto-Harmonization to blend the subject with the base scene color temperature.',
            friendly: 'Pro-tip for seamless blending: Turn on Auto-Harmonization so their skin tone matches the scene lighting! 🎨',
            mentor: 'Color temperature discrepancy between foreground and background breaks visual continuity. Apply Auto-Harmonization.',
            roast: level => 'They look like they were photographed on Mars and pasted into a Starbucks. Hit Auto-Harmonize! 🪐',
            chaos: 'HYPERSPACE LIGHT CLASH! Blend them into the neon matrix! 🧪'
          }
        ]
      }
    };
  }

  /**
   * Main evaluation entry point called on every canvas edit
   */
  evaluate(state, personality = 'friendly', roastLevel = 3) {
    return this.evaluateState(state, personality, roastLevel);
  }

  evaluateState(state, personality = 'friendly', roastLevel = 3) {
    if (!state) return { activeMistakes: [], summary: 'No state' };
    this.lastEvaluatedState = state;

    const activeMistakes = [];
    const embedded = this.getEmbeddedKnowledge();
    const categories = ['colorTheory', 'typography', 'contrast', 'lightingAndMood', 'compositingAndStyle'];

    for (const cat of categories) {
      const rules = embedded[cat]?.commonMistakes || [];
      for (const rule of rules) {
        let isTriggered = false;
        try {
          isTriggered = rule.trigger(state);
        } catch (e) {
          isTriggered = false;
        }

        if (isTriggered) {
          let phrased = '';
          const p = (personality || 'friendly').toLowerCase();
          if (p === 'friendly') phrased = rule.friendly || rule.friendlyTip;
          else if (p === 'mentor') phrased = rule.mentor || rule.mentorTip;
          else if (p === 'roast') phrased = typeof rule.roast === 'function' ? rule.roast(roastLevel) : (rule.roast || rule.roastTip);
          else if (p === 'chaos') phrased = rule.chaos || rule.phrasedFeedback;

          activeMistakes.push({
            id: rule.id,
            category: cat,
            issue: rule.issue,
            fix: rule.fix,
            targetSelector: rule.targetSelector,
            phrasedFeedback: phrased || rule.issue,
            isCritical: true
          });
        }
      }
    }

    // Handle activity feed & micro-interactions with cooldown
    this.processActiveTriggers(activeMistakes, personality);

    // Update creative fingerprint scores dynamically
    this.updateFingerprintFromState(state);

    return { activeMistakes, activeCount: activeMistakes.length };
  }

  processActiveTriggers(activeMistakes, personality) {
    const now = Date.now();
    for (const item of activeMistakes) {
      const lastFired = this.firedRuleCooldowns.get(item.id) || 0;
      // 8 seconds cooldown per specific rule to prevent spamming
      if (now - lastFired > 8000) {
        this.firedRuleCooldowns.set(item.id, now);

        // Push to activity feed
        this.pushToActivityFeed(item);

        // Trigger Mascot micro-reaction & point beam!
        if (window.Mascot) {
          window.Mascot.flinch(item.phrasedFeedback);
          if (item.targetSelector) {
            window.Mascot.pointAt(item.targetSelector);
          }
        }
        break; // Trigger at most one animated reaction per batch
      }
    }
  }

  pushToActivityFeed(item) {
    // Check for chat container or activity feed
    const container = document.getElementById('chat-messages-container') || document.getElementById('copilot-activity-feed');
    if (!container) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubble = document.createElement('div');
    bubble.className = 'flex gap-3 pop-in mb-2';
    bubble.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">
        <iconify-icon icon="lucide:bot"></iconify-icon>
      </div>
      <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed text-slate-700 max-w-[90%] shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">⚡ ${item.category.toUpperCase()}</span>
          <span class="text-[10px] text-slate-400 font-mono">${time}</span>
        </div>
        <p class="font-medium text-slate-800 mb-1">${item.phrasedFeedback}</p>
        <div class="text-[11px] text-slate-500 bg-white/70 p-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
          <span>💡 <strong>Tip:</strong> ${item.fix}</span>
        </div>
      </div>
    `;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  generateActionFeedback(action, detail, state, personality = 'friendly', roastLevel = 3) {
    const p = (personality || 'friendly').toLowerCase();
    const adj = state?.adjustments || {};

    if (action === 'filter_applied') {
      const filterName = detail.filter || state.filter || 'preset';
      if (p === 'mentor') {
        return `[Color Grading Applied] The "${filterName}" look shifts chromatic balance and contrast curves. Watch your highlight roll-off in the brightest zones.`;
      } else if (p === 'roast') {
        return `Slapped the "${filterName}" filter on it? Instant aesthetic upgrade, or at least a stylish cover-up! 😉`;
      } else if (p === 'chaos') {
        return `FILTRATION VECTOR DEPLOYED: "${filterName}" is vibrating at maximum frequency! ⚡👾`;
      } else {
        return `Ooh, love that "${filterName}" vibe! ✨ It gives the artwork a whole new atmosphere!`;
      }
    }

    if (action === 'layer_added') {
      const type = detail.layer?.type || 'layer';
      if (p === 'mentor') {
        return `[Layer Structure] Added ${type} layer. Ensure sufficient visual hierarchy so it complements the primary focal hero without cluttering negative space.`;
      } else if (p === 'roast') {
        return `Another layer? Careful, or we will need a filing cabinet to organize this canvas! 🥞`;
      } else if (p === 'chaos') {
        return `STACK IT UP! More layers = more creative energy! 🚀`;
      } else {
        return `Added a new ${type} layer! It's shaping up wonderfully! 🌟`;
      }
    }

    if (action === 'crop_applied') {
      if (p === 'mentor') {
        return `[Composition Refined] Crop updated. Notice how re-framing changes the visual center of gravity and leads the viewer's eye.`;
      } else if (p === 'roast') {
        return `Snip snip! Clean cut. You just sliced away the boring parts! ✂️`;
      } else {
        return `Nice crop! That tighter framing makes the hero subject really stand out! 📸`;
      }
    }

    if (action === 'rotate') {
      if (p === 'mentor') {
        return `[Orientation Shift] Rotated canvas 90°. Diagonal and vertical lines now establish a new dynamic reading trajectory.`;
      } else {
        return `Rotated 90°! A fresh angle on your artwork! 🔄`;
      }
    }

    if (action === 'text_added') {
      if (p === 'mentor') {
        return `[Typography Added] New text layer. Keep at least a 10% safety margin from canvas boundaries to avoid edge crowding.`;
      } else if (p === 'roast') {
        return `Look at you writing words! Make sure it is legible or we will need magnifying glasses! ✍️`;
      } else {
        return `Awesome typography! That bold headline gives your design a strong voice! ✍️✨`;
      }
    }

    if (action === 'sticker_added') {
      if (p === 'mentor') {
        return `[Visual Accent] Sticker placed. Balance its high chroma against neutral background areas.`;
      } else if (p === 'roast') {
        return `Stickers make everything 100% more professional. That's a verified design fact. 😎`;
      } else {
        return `Cute sticker! Love the playful energy! ✨`;
      }
    }

    if (action === 'adjustment_change') {
      const param = detail.param;
      const val = detail.value !== undefined ? detail.value : (adj[param] || 0);
      if (p === 'mentor') {
        return `[Tonal Calibration] ${param} adjusted to ${val > 0 ? '+' + val : val}. Observing changes in dynamic range and chromatic saturation.`;
      } else if (p === 'roast') {
        return Math.abs(val) > 40 ? `Whoa! ${param} at ${val}? Living dangerously on the edge of the gamut! 🔥` : `Adjusted ${param} to ${val}. Looking a bit crisper!`;
      } else {
        return `Tuned ${param} to ${val > 0 ? '+' + val : val}! Looking sharper with every adjustment! ✨`;
      }
    }

    return null;
  }

  updateFingerprintFromState(state) {
    const adj = state.adjustments || {};
    const layers = state.layers || [];
    const sat = Math.abs(adj.saturation || 0);
    const con = Math.abs(adj.contrast || 0);
    const temp = Math.abs(adj.temperature || 0);
    const tint = Math.abs(adj.tint || 0);
    const textCount = layers.filter(l => l.type === 'text').length;
    const stickerCount = layers.filter(l => l.type === 'sticker' || l.type === 'shape').length;

    const colorScore = Math.max(20, Math.min(95, 50 + (sat > 10 ? 20 : 0) + (temp > 10 ? 15 : 0) + (tint > 10 ? 10 : 0)));
    const contrastScore = Math.max(20, Math.min(95, 50 + (con > 15 ? 25 : -10) + (adj.exposure ? 15 : 0)));
    const compScore = Math.max(30, Math.min(95, 50 + (layers.length >= 2 ? 25 : 0) + (adj.vignette ? 15 : 0)));
    const typeScore = Math.max(20, Math.min(95, 40 + (textCount * 25)));
    const expScore = Math.max(20, Math.min(95, 30 + (stickerCount * 15) + (state.filter && state.filter !== 'none' ? 25 : 0) + (sat > 50 ? 15 : 0)));

    const newFingerprint = {
      color: colorScore,
      composition: compScore,
      typography: typeScore,
      experimentation: expScore,
      contrast: contrastScore
    };

    state.fingerprint = newFingerprint;

    if (window.RadarChart) {
      window.RadarChart.update(newFingerprint);
    }
  }
}

window.DesignRuleEngine = DesignRuleEngine;
