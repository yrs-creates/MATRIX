/**
 * PUX PILOT — Backend AI Co-Pilot Server
 * Features: Dynamic Knowledge-Slice Injection, Multi-Provider LLM Fallback (Groq -> OpenRouter -> Gemini -> Rule Engine),
 * Offline-First Reliability, State-Aware Design Analysis & Gamification.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
// Bind to loopback by default. Binding to 0.0.0.0 can be blocked by local
// security policies and is unnecessary when the app is only used locally.
// Set HOST=0.0.0.0 in .env only when the app must be reachable from other devices.
const HOST = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Load Design Knowledge & Few-Shot Examples
let designKnowledge = {};
let fewShotExamples = {};

try {
  const knowledgeRaw = fs.readFileSync(path.join(__dirname, 'design-knowledge.json'), 'utf8');
  designKnowledge = JSON.parse(knowledgeRaw);
  const examplesRaw = fs.readFileSync(path.join(__dirname, 'few-shot-examples.json'), 'utf8');
  fewShotExamples = JSON.parse(examplesRaw);
  console.log('✓ Successfully loaded design-knowledge.json and few-shot-examples.json');
} catch (err) {
  console.error('Warning: Failed to load local knowledge files:', err.message);
}

// Analytics feedback log buffer
const feedbackLog = [];

/* ==========================================================================
   DYNAMIC KNOWLEDGE INJECTION ENGINE
   ========================================================================== */

/**
 * Evaluates triggers against canvas state and extracts only relevant knowledge slices
 */
function extractRelevantKnowledge(state = {}) {
  const adjustments = state.adjustments || {};
  const layers = state.layers || [];
  const saturation = adjustments.saturation || 0;
  const contrast = adjustments.contrast || 0;
  const brightness = adjustments.brightness || 0;
  const exposure = adjustments.exposure || 0;
  const temperature = adjustments.temperature || 0;
  const tint = adjustments.tint || 0;
  const vignette = adjustments.vignette || 0;
  const sharpness = adjustments.sharpness || 0;
  const layerCount = layers.length;
  const textLayers = layers.filter(l => l.type === 'text');
  const textLayerCount = textLayers.length;

  const relevantMistakes = [];
  const principles = [];

  // Helper context variables
  const context = {
    saturation,
    contrast,
    brightness,
    exposure,
    temperature,
    tint,
    vignette,
    sharpness,
    layerCount,
    textLayerCount,
    hasTextLayer: textLayerCount > 0,
    textNearEdge: textLayers.some(t => (t.x < 0.08 || t.x > 0.92 || t.y < 0.08 || t.y > 0.92)),
    textContrastLow: textLayers.some(t => !t.strokeColor && !t.shadowColor),
    subjectCentered: true,
    isBusyBackground: layerCount > 3,
    layersAsymmetricWithoutBalance: false
  };

  // Evaluate Color Theory triggers
  if (designKnowledge.colorTheory?.commonMistakes) {
    for (const rule of designKnowledge.colorTheory.commonMistakes) {
      if (rule.id === 'color_competing_saturation' && saturation > 70 && layerCount > 2) relevantMistakes.push(rule);
      if (rule.id === 'color_heavy_tint' && Math.abs(tint) > 35) relevantMistakes.push(rule);
      if (rule.id === 'color_extreme_temperature' && (temperature > 45 || temperature < -45)) relevantMistakes.push(rule);
      if (rule.id === 'color_neon_clash' && saturation > 55 && contrast > 45) relevantMistakes.push(rule);
    }
  }

  // Evaluate Composition triggers
  if (designKnowledge.composition?.commonMistakes) {
    for (const rule of designKnowledge.composition.commonMistakes) {
      if (rule.id === 'composition_cluttered_canvas' && layerCount > 5) relevantMistakes.push(rule);
      if (rule.id === 'composition_dead_center_busy' && layerCount >= 4) relevantMistakes.push(rule);
    }
  }

  // Evaluate Typography triggers
  if (designKnowledge.typography?.commonMistakes) {
    for (const rule of designKnowledge.typography.commonMistakes) {
      if (rule.id === 'typography_edge_crowding' && context.textNearEdge) relevantMistakes.push(rule);
      if (rule.id === 'typography_too_many_fonts' && textLayerCount > 2) relevantMistakes.push(rule);
      if (rule.id === 'typography_poor_contrast' && context.textContrastLow) relevantMistakes.push(rule);
    }
  }

  // Evaluate Contrast triggers
  if (designKnowledge.contrast?.commonMistakes) {
    for (const rule of designKnowledge.contrast.commonMistakes) {
      if (rule.id === 'contrast_flat_washed_out' && (contrast < -20 || (brightness > 25 && contrast < 0))) relevantMistakes.push(rule);
      if (rule.id === 'contrast_crushed_shadows' && (brightness < -30 && (contrast > 30 || vignette > 50))) relevantMistakes.push(rule);
      if (rule.id === 'contrast_blown_highlights' && (exposure > 40 || (brightness > 35 && contrast > 35))) relevantMistakes.push(rule);
    }
  }

  // Evaluate Lighting & Mood triggers
  if (designKnowledge.lightingAndMood?.commonMistakes) {
    for (const rule of designKnowledge.lightingAndMood.commonMistakes) {
      if (rule.id === 'lighting_excessive_vignette' && vignette > 70) relevantMistakes.push(rule);
      if (rule.id === 'lighting_over_sharpening' && sharpness > 65) relevantMistakes.push(rule);
    }
  }

  return {
    relevantMistakes,
    activeTriggersCount: relevantMistakes.length,
    context
  };
}

/**
 * Builds dynamic system prompt injecting only active knowledge slices & personality examples
 */
function buildSystemPrompt(state = {}, personality = 'friendly', roastLevel = 3) {
  const { relevantMistakes, context } = extractRelevantKnowledge(state);
  const personalityKey = personality.toLowerCase();
  const examples = fewShotExamples[personalityKey] || fewShotExamples.friendly || [];

  let toneGuidance = '';
  if (personalityKey === 'friendly') {
    toneGuidance = 'Your name is Friddyy. You are enthusiastic, encouraging, playful, and give practical photo-editing tips with fun emojis (✨, 🌟, 🎨).';
  } else if (personalityKey === 'mentor') {
    toneGuidance = 'You are the Senior Design Mentor and Creative Director. You provide structured, educational, pedagogical feedback referencing formal design principles: Color Theory (Complementary/Analogous/Triadic harmonies, 60-30-10 rule), Composition (Rule of Thirds, Golden Ratio, Figure-Ground separation), Contrast (Luminance Dynamic Range, Tonal Roll-off), and Typography (3-tier hierarchy, WCAG 4.5:1 contrast, safe margins). Sound like an experienced art school professor: constructive, specific, and insightful.';
  } else if (personalityKey === 'roast') {
    toneGuidance = `Your name is Friddyy and you are in Roast Master mode at intensity level ${roastLevel} (out of 5).
Level 1 is gentle teasing; Level 3 is sarcastic designer wit; Level 5 is ruthless, hilarious, unfiltered creative demolition. Be clever, witty, and reference their exact slider mistakes.`;
  } else if (personalityKey === 'chaos') {
    toneGuidance = 'Your name is Friddyy. You embrace extreme psychedelia, cyberpunk maximalism, glitch aesthetics, bold neon contrasts, and wild creative experiments. Talk with explosive creative energy!';
  }

  let knowledgeSection = '';
  if (relevantMistakes.length > 0) {
    knowledgeSection = `\n--- ACTIVE DESIGN ISSUES DETECTED IN THIS CANVAS ---\n` +
      relevantMistakes.map(m => `• Issue: ${m.issue}\n  Recommended Fix: ${m.fix}`).join('\n');
  } else {
    knowledgeSection = `\n--- DESIGN STATE ---\nCanvas adjustments are currently balanced and within normal aesthetic parameters.`;
  }

  const stateSummary = `\n--- CURRENT CANVAS STATE ---
- Adjustments: Brightness=${context.brightness}, Contrast=${context.contrast}, Saturation=${context.saturation}, Exposure=${context.exposure}, Temperature=${context.temperature}, Tint=${context.tint}, Vignette=${context.vignette}, Sharpness=${context.sharpness}
- Total Layers: ${context.layerCount} (${context.textLayerCount} text layers)
- Filter applied: ${state.filter || 'None'}
- Creative Fingerprint: Color=${state.fingerprint?.color || 50}, Comp=${state.fingerprint?.composition || 50}, Type=${state.fingerprint?.typography || 50}, Exp=${state.fingerprint?.experimentation || 50}, Contrast=${state.fingerprint?.contrast || 50}`;

  const fewShotText = `\n--- CONVERSATION EXAMPLES FOR THIS PERSONALITY ---\n` +
    examples.map(ex => `User: ${ex.user}\nAssistant: ${ex.assistant}`).join('\n\n');

  return `Your name is Friddyy. You are the lively creative companion inside Pux Pilot photo editor. Never refer to yourself as a pilot, co-pilot, assistant, bot, or by any other name.
Your mission is to guide the user to make visually stunning, professional, and impactful designs.

${toneGuidance}

${stateSummary}

${knowledgeSection}

${fewShotText}

Instructions:
- Begin with a warm, witty, or dramatic reaction, then give one clear, specific next action.
- Keep answers concise, engaging, and directly applicable to the photo editor.
- Sound like a real creative friend: lively, expressive, and responsive to the user's exact edit.
- Include 1 to 3 natural, relevant emoji in every user-facing reply. Never write emoji names, HTML entities, or escaped Unicode codes.
- Whenever relevant, mention specific sliders or layer actions the user can try.
- In Mentor mode, teach the underlying design theory (e.g. why 60-30-10 balance works, why high contrast creates figure-ground depth, how complementary color pairs build vibrancy).
- Stay firmly in character. Never break persona.`;
}

/* ==========================================================================
   MULTI-PROVIDER LLM CASCADE CLIENT
   ========================================================================== */

/**
 * Tries Groq -> OpenRouter -> Gemini -> Rule Engine
 */
async function callLLMCascade(systemPrompt, userMessage, options = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try Groq (Llama 3.3 70B Versatile)
  if (groqKey && groqKey.trim()) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 600,
          response_format: options.jsonFormat ? { type: 'json_object' } : undefined
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return { text: reply, provider: 'groq', model: 'llama-3.3-70b-versatile' };
        }
      } else {
        console.warn(`Groq API returned ${response.status}: ${await response.text().catch(() => '')}`);
      }
    } catch (err) {
      console.warn('Groq provider attempt failed, cascading to next provider:', err.message);
    }
  }

  // 2. Try OpenRouter (Multi-model free/paid router)
  if (openRouterKey && openRouterKey.trim()) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Pux Pilot'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 600,
          response_format: options.jsonFormat ? { type: 'json_object' } : undefined
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return { text: reply, provider: 'openrouter', model: 'llama-3.3-70b-instruct' };
        }
      }
    } catch (err) {
      console.warn('OpenRouter provider attempt failed, cascading to Gemini:', err.message);
    }
  }

  // 3. Try Google Gemini Flash
  if (geminiKey && geminiKey.trim()) {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey.trim()
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.max_tokens || 800,
            responseMimeType: options.jsonFormat ? 'application/json' : 'text/plain'
          }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return { text: reply, provider: 'gemini', model: 'gemini-2.5-flash' };
        }
      }
    } catch (err) {
      console.warn('Gemini provider attempt failed, falling back to rule engine:', err.message);
    }
  }

  // 4. Guaranteed Rule-Engine Fallback
  return { text: null, provider: 'rule-engine', fallback: true };
}

/* ==========================================================================
   OFFLINE RULE-BASED SYNTHESIS GENERATORS (UPGRADED WITH DEEP DESIGN KNOWLEDGE)
   ========================================================================== */

function generateRuleBasedChatReply(message = '', state = {}, personality = 'friendly', roastLevel = 3) {
  const p = personality.toLowerCase();
  const lowerMsg = message.toLowerCase();
  const { relevantMistakes, context } = extractRelevantKnowledge(state);

  // Easter egg check
  if (lowerMsg.includes('make it weird') || lowerMsg.includes('chaos mode')) {
    return "⚡🌀 WEIRD MODE ENGAGED! Inverting chromatic polarities, boosting saturation to supernova levels, and infusing neon energy into your viewport. Pure digital alchemy! 👾🎨";
  }

  // Mentor Mode: Educational, theory-backed design guidance
  if (p === 'mentor') {
    // Topic: Color Theory
    if (lowerMsg.includes('color') || lowerMsg.includes('palette') || lowerMsg.includes('harmony') || lowerMsg.includes('saturation')) {
      const sat = context.saturation;
      const temp = context.temperature;
      if (sat > 60) {
        return `[Design Mentor Analysis] High saturation (+${sat}) across the viewport risks visual fatigue. According to the 60-30-10 rule, consider keeping 60% of background areas neutral and concentrating high saturation (+50%) solely on your primary focal hero for maximum punch.`;
      } else if (temp > 30) {
        return `[Design Mentor Analysis] Your warm temperature (+${temp}) evokes golden hour nostalgia. To build chromatic tension, pair this warmth with cool shadows or a complementary teal accent on secondary layers.`;
      } else if (temp < -30) {
        return `[Design Mentor Analysis] The cool temperature (${temp}) creates a cinematic, moody atmosphere. Maintain white point integrity by keeping tint within [-10, +10] so neutral whites don't cast cyan.`;
      } else {
        return `[Design Mentor Analysis] Color balance is stable. For a dynamic look, explore Complementary harmonies (Teal/Amber) for high energy, or Analogous palettes (Orange/Gold/Peach) for serene, organic cohesion.`;
      }
    }

    // Topic: Composition
    if (lowerMsg.includes('composition') || lowerMsg.includes('crop') || lowerMsg.includes('layout') || lowerMsg.includes('balance') || lowerMsg.includes('rule of third')) {
      if (context.layerCount > 4) {
        return `[Design Mentor Analysis] Visual hierarchy check: With ${context.layerCount} active layers, visual clutter can disorient the eye. Ensure your hero element occupies at least 40% of the visual weight, and preserve 30% negative space around the perimeter.`;
      } else {
        return `[Design Mentor Analysis] Composition looks clean. Utilize the Rule of Thirds by aligning your subject along the 1/3 grid intersections, and apply a subtle +15% to +25% vignette to naturally direct viewer eye flow toward center.`;
      }
    }

    // Topic: Typography
    if (lowerMsg.includes('text') || lowerMsg.includes('font') || lowerMsg.includes('typography') || lowerMsg.includes('title') || lowerMsg.includes('headline')) {
      if (context.textNearEdge) {
        return `[Design Mentor Analysis] Typographic safe margin violation: Text is within 6% of the canvas boundary. Standard editorial practice requires a minimum 8-12% internal margin to prevent visual claustrophobia and ensure mobile viewport safety.`;
      } else {
        return `[Design Mentor Analysis] Establish a strict 3-tier typographic scale (Headline: 48-64px Display, Subhead: 20-28px Medium, Detail: 12-14px). Ensure a minimum 4.5:1 luminance contrast ratio against the background with a soft drop shadow.`;
      }
    }

    // Topic: Contrast & Lighting
    if (lowerMsg.includes('contrast') || lowerMsg.includes('light') || lowerMsg.includes('exposure') || lowerMsg.includes('brightness') || lowerMsg.includes('vignette')) {
      const con = context.contrast;
      if (con < 10) {
        return `[Design Mentor Analysis] Tonal dynamic range is somewhat flat. Lifting contrast by +18 to +25 will anchor true blacks, enhancing figure-ground separation between subject and background.`;
      } else if (con > 45) {
        return `[Design Mentor Analysis] High contrast (+${con}) creates harsh edge transitions and risks clipping shadow detail. Ease contrast back to +25 for smooth, filmic tonal gradation.`;
      } else {
        return `[Design Mentor Analysis] Dynamic range is well-calibrated. A subtle vignette (+20) will provide natural optical fall-off and focus viewer attention.`;
      }
    }

    // Active issue audit
    if (relevantMistakes.length > 0) {
      const topIssue = relevantMistakes[0];
      return `[Design Mentor Critique] Observation: ${topIssue.issue}\nPedagogical Fix: ${topIssue.fix}`;
    }

    return `[Design Mentor Evaluation] Your canvas demonstrates solid tonal balance (Contrast: ${context.contrast}, Saturation: ${context.saturation}, Layers: ${context.layerCount}). To elevate this piece further, refine your primary focal anchor and consider applying a complementary color accent.`;
  }

  // Roast Mode: Funny, witty burns referencing specific sliders
  if (p === 'roast') {
    if (relevantMistakes.length > 0) {
      const topIssue = relevantMistakes[0];
      if (roastLevel >= 4) {
        return `Level ${roastLevel} Roast: ${topIssue.issue} Honestly, my graphics card is filing a restraining order. Do your audience a favor: ${topIssue.fix} 🔥`;
      } else {
        return `Quick roast: ${topIssue.issue} Easy fix before the design police show up: ${topIssue.fix} 😉`;
      }
    }
    if (context.saturation > 50) {
      return `Level ${roastLevel} Roast: Did you drop a neon highlighter on the saturation slider? Dial it back before the screen burns into my retina! 🔥`;
    }
    if (context.contrast < -15) {
      return `Level ${roastLevel} Roast: This image has less contrast than a glass of skim milk in a snowstorm. Boost the contrast! 🥛`;
    }
    return `Level ${roastLevel} Roast: It's not the worst design I've seen... which is an insult to the second worst. Bump the contrast or add some real personality! 😉`;
  }

  // Chaos Mode: Wild maximalist energy
  if (p === 'chaos') {
    return `THE CREATIVE MATRIX IS VIBRATING! Slap a glowing sticker, crank the vibrance to supernova, and let's make something unhinged! 🛸🔥👾`;
  }

  // Friendly Mode: Encouraging, supportive, cute
  if (relevantMistakes.length > 0) {
    const topIssue = relevantMistakes[0];
    return `Hey! I noticed that ${topIssue.issue.toLowerCase()} Here's a quick pro-tip: ${topIssue.fix} ✨ You've got this!`;
  }

  return `Your canvas is looking super fresh! Try experimenting with the 'Vignette' slider or add a bold typography layer to make your message pop! 🌟`;
}

function generateRuleBasedScorecard(state = {}) {
  const adj = state.adjustments || {};
  const layers = state.layers || [];
  const sat = adj.saturation || 0;
  const con = adj.contrast || 0;
  const bri = adj.brightness || 0;
  const exp = adj.exposure || 0;
  const temp = adj.temperature || 0;
  const vign = adj.vignette || 0;
  const textLayers = layers.filter(l => l.type === 'text');

  // Compute category scores (0-100)
  let colorScore = Math.max(20, Math.min(100, 85 - Math.abs(sat > 60 ? (sat - 60) * 0.8 : 0) - Math.abs(temp > 40 ? (temp - 40) * 0.5 : 0)));
  let contrastScore = Math.max(20, Math.min(100, 88 - (con < -15 ? 30 : 0) - (bri < -35 ? 25 : 0) - (exp > 40 ? 25 : 0)));
  let compScore = Math.max(30, Math.min(100, 82 + (layers.length >= 2 && layers.length <= 5 ? 10 : -10)));
  let typeScore = textLayers.length > 0 ? (textLayers.some(t => t.x < 0.08 || t.x > 0.92) ? 65 : 90) : 75;
  let hierarchyScore = Math.max(30, Math.min(100, 80 + (vign > 15 && vign < 50 ? 10 : 0) - (layers.length > 6 ? 20 : 0)));

  colorScore = Math.round(colorScore);
  contrastScore = Math.round(contrastScore);
  compScore = Math.round(compScore);
  typeScore = Math.round(typeScore);
  hierarchyScore = Math.round(hierarchyScore);

  const overall = Math.round((colorScore + contrastScore + compScore + typeScore + hierarchyScore) / 5);

  let working = 'Clean tonal foundation with good base clarity.';
  let improve = 'Dynamic range and negative space could be more pronounced.';
  let recommendation = 'Adjust contrast slightly and balance focal elements for a sharper look.';

  if (con < 10) {
    improve = 'Image looks slightly flat and could benefit from stronger contrast.';
    recommendation = 'Boost contrast by +15-20 to anchor rich blacks.';
  } else if (sat > 60) {
    improve = 'High saturation may cause eye fatigue on saturated monitors.';
    recommendation = 'Ease saturation down to +25-35 for a more cinematic palette.';
  } else if (textLayers.length > 0 && textLayers.some(t => t.x < 0.08 || t.x > 0.92)) {
    improve = 'Text is crowded close to the canvas edge.';
    recommendation = 'Nudge text inward to give at least 10% breathing room.';
  }

  return {
    scores: {
      composition: compScore,
      colorHarmony: colorScore,
      contrast: contrastScore,
      typography: typeScore,
      visualHierarchy: hierarchyScore
    },
    overall,
    feedback: {
      working,
      improve,
      recommendation
    },
    provider: 'rule-engine',
    offline: true
  };
}

function generateRuleBasedMakeItBetter(state = {}) {
  const adj = state.adjustments || {};
  const sat = adj.saturation || 0;
  const con = adj.contrast || 0;
  const bri = adj.brightness || 0;
  const vign = adj.vignette || 0;
  const temp = adj.temperature || 0;

  const suggestions = [];

  // 1. Contrast adjustment
  if (con < 15) {
    suggestions.push({
      type: 'adjustment',
      param: 'contrast',
      from: con,
      to: Math.min(60, con + 18),
      label: `Punch up contrast from ${con} to ${con + 18} for crisp depth`
    });
  } else if (con > 50) {
    suggestions.push({
      type: 'adjustment',
      param: 'contrast',
      from: con,
      to: 28,
      label: `Ease harsh contrast down from ${con} to 28 for smoother tonal roll-off`
    });
  }

  // 2. Saturation adjustment
  if (sat > 55) {
    suggestions.push({
      type: 'adjustment',
      param: 'saturation',
      from: sat,
      to: 22,
      label: `Dial back saturation from ${sat} to 22 for a refined editorial look`
    });
  } else if (sat < -10) {
    suggestions.push({
      type: 'adjustment',
      param: 'saturation',
      from: sat,
      to: 12,
      label: `Infuse gentle color vibrance (+12) into muted midtones`
    });
  }

  // 3. Vignette enhancement
  if (vign < 10) {
    suggestions.push({
      type: 'adjustment',
      param: 'vignette',
      from: vign,
      to: 26,
      label: `Apply subtle vignette (26%) to focus gaze toward the center`
    });
  }

  // 4. Temperature / Tint harmony
  if (Math.abs(temp) > 35) {
    suggestions.push({
      type: 'adjustment',
      param: 'temperature',
      from: temp,
      to: temp > 0 ? 12 : -12,
      label: `Neutralize extreme color temperature to preserve authentic whites`
    });
  } else {
    suggestions.push({
      type: 'adjustment',
      param: 'sharpness',
      from: adj.sharpness || 0,
      to: 20,
      label: `Add micro-sharpness (+20) for crisp retina display rendering`
    });
  }

  return suggestions.slice(0, 3);
}

/* ==========================================================================
   CHALLENGE POOL GENERATOR
   ========================================================================== */

const CHALLENGE_PRESETS = [
  {
    id: 'cyberpunk_noir',
    title: 'Cyberpunk Noir',
    description: 'Create a high-energy futuristic composition using cool tones, strong contrast, and at least one text badge.',
    difficulty: 'Medium',
    xp: 150,
    requirements: [
      { id: 'req_contrast', text: 'Contrast >= +25', check: s => (s.adjustments?.contrast || 0) >= 25 },
      { id: 'req_temp', text: 'Cool Temperature (<= -15)', check: s => (s.adjustments?.temperature || 0) <= -15 },
      { id: 'req_layers', text: 'At least 2 layers (Text, Sticker or Shape)', check: s => (s.layers?.length || 0) >= 2 }
    ]
  },
  {
    id: 'golden_minimal',
    title: 'Golden Hour Minimalist',
    description: 'Craft an elegant, warm-toned editorial image with soft vignetting and uncluttered breathing room.',
    difficulty: 'Easy',
    xp: 100,
    requirements: [
      { id: 'req_warmth', text: 'Warm Temperature (>= +15)', check: s => (s.adjustments?.temperature || 0) >= 15 },
      { id: 'req_vignette', text: 'Vignette between 15% and 45%', check: s => (s.adjustments?.vignette || 0) >= 15 && (s.adjustments?.vignette || 0) <= 45 },
      { id: 'req_clean', text: 'Clean layout (<= 4 layers)', check: s => (s.layers?.length || 0) <= 4 }
    ]
  },
  {
    id: 'bold_editorial',
    title: 'Bold Editorial Poster',
    description: 'Design a striking magazine-style poster featuring a prominent headline, high clarity, and balanced vibrance.',
    difficulty: 'Hard',
    xp: 250,
    requirements: [
      { id: 'req_has_text', text: 'Include at least 1 Text layer with bold headline', check: s => (s.layers || []).some(l => l.type === 'text') },
      { id: 'req_sat', text: 'Controlled saturation (-10 to +35)', check: s => (s.adjustments?.saturation || 0) >= -10 && (s.adjustments?.saturation || 0) <= 35 },
      { id: 'req_sharp', text: 'Sharpness >= +15', check: s => (s.adjustments?.sharpness || 0) >= 15 }
    ]
  },
  {
    id: 'chaos_unleashed',
    title: 'Chaos Dimension',
    description: 'Break every rule! Hyper saturation, extreme angles, and multiple playful stickers.',
    difficulty: 'Fun',
    xp: 200,
    requirements: [
      { id: 'req_sat_high', text: 'Saturation >= +40 or Tint != 0', check: s => (s.adjustments?.saturation || 0) >= 40 || (s.adjustments?.tint || 0) !== 0 },
      { id: 'req_stickers', text: 'At least 3 layers (stickers, shapes or brush)', check: s => (s.layers?.length || 0) >= 3 },
      { id: 'req_filter', text: 'Apply any creative preset filter', check: s => !!s.filter && s.filter !== 'none' }
    ]
  }
];

/* ==========================================================================
   API ROUTES
   ========================================================================== */

/**
 * GET /api/knowledge
 * Serves the single source of truth design knowledge JSON
 */
app.get('/api/knowledge', (req, res) => {
  res.json({ success: true, knowledge: designKnowledge });
});

/**
 * POST /api/ai/chat
 * Live conversation with the Co-Pilot
 */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, stateObject, personality = 'friendly', roastLevel = 3 } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = buildSystemPrompt(stateObject, personality, roastLevel);
    const llmResult = await callLLMCascade(systemPrompt, message, { temperature: personality === 'chaos' ? 0.9 : 0.7 });

    if (llmResult.text && !llmResult.fallback) {
      return res.json({
        reply: llmResult.text,
        personality,
        provider: llmResult.provider,
        model: llmResult.model,
        fallback: false
      });
    }

    // Offline / Fallback reply
    const fallbackReply = generateRuleBasedChatReply(message, stateObject, personality, roastLevel);
    return res.json({
      reply: fallbackReply,
      personality,
      provider: 'rule-engine',
      fallback: true,
      offline: true
    });
  } catch (err) {
    console.error('Error in /api/ai/chat:', err);
    const fallbackReply = generateRuleBasedChatReply(req.body?.message || '', req.body?.stateObject || {}, req.body?.personality || 'friendly');
    return res.json({
      reply: fallbackReply,
      personality: req.body?.personality || 'friendly',
      provider: 'rule-engine',
      fallback: true
    });
  }
});

/**
 * POST /api/ai/analyze
 * Generates structured 5-dimension scorecard + feedback
 */
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { stateObject, personality = 'mentor' } = req.body;
    const systemPrompt = `You are a world-class art director and design intelligence system.
Analyze the provided canvas state and return ONLY a valid JSON object strictly matching this schema:
{
  "scores": {
    "composition": <number 0-100>,
    "colorHarmony": <number 0-100>,
    "contrast": <number 0-100>,
    "typography": <number 0-100>,
    "visualHierarchy": <number 0-100>
  },
  "overall": <number 0-100>,
  "feedback": {
    "working": "<concise 1-2 sentence praise of what works>",
    "improve": "<concise 1-2 sentence constructive critique>",
    "recommendation": "<one concrete actionable slider or layer adjustment>"
  }
}
Do NOT include markdown fences, extra text, or explanations outside the JSON.`;

    const userPrompt = `Canvas State for Evaluation:\n${JSON.stringify(stateObject || {}, null, 2)}`;
    const llmResult = await callLLMCascade(systemPrompt, userPrompt, { jsonFormat: true, temperature: 0.3 });

    if (llmResult.text && !llmResult.fallback) {
      try {
        const cleaned = llmResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.scores && parsed.feedback && typeof parsed.overall === 'number') {
          return res.json({
            ...parsed,
            provider: llmResult.provider,
            model: llmResult.model,
            fallback: false
          });
        }
      } catch (parseErr) {
        console.warn('Failed to parse LLM JSON for analyze:', parseErr.message);
      }
    }

    // Rule-based fallback scorecard
    const ruleScorecard = generateRuleBasedScorecard(stateObject);
    return res.json(ruleScorecard);
  } catch (err) {
    console.error('Error in /api/ai/analyze:', err);
    return res.json(generateRuleBasedScorecard(req.body?.stateObject || {}));
  }
});

/**
 * POST /api/ai/make-it-better
 * Returns 2-4 concrete proposed parameter adjustments with checkboxes
 */
app.post('/api/ai/make-it-better', async (req, res) => {
  try {
    const { stateObject } = req.body;
    const systemPrompt = `You are an expert automated photo enhancement system.
Look at the canvas state and return ONLY a valid JSON array of 2 to 4 actionable improvement suggestions.
Each item MUST match this exact schema:
{
  "type": "adjustment",
  "param": "<one of: brightness, contrast, saturation, exposure, temperature, tint, vignette, sharpness, blur>",
  "from": <current value number>,
  "to": <improved target value number>,
  "label": "<short user-friendly description of why and what changed>"
}
Return strictly the JSON array, no wrapper objects or markdown formatting.`;

    const userPrompt = `Current Canvas Adjustments:\n${JSON.stringify(stateObject?.adjustments || {}, null, 2)}`;
    const llmResult = await callLLMCascade(systemPrompt, userPrompt, { jsonFormat: true, temperature: 0.3 });

    if (llmResult.text && !llmResult.fallback) {
      try {
        const cleaned = llmResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let parsed = JSON.parse(cleaned);
        if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.suggestions)) {
          parsed = parsed.suggestions;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validParams = ['brightness', 'contrast', 'saturation', 'exposure', 'temperature', 'tint', 'vignette', 'sharpness', 'blur'];
          const validated = parsed.filter(item => validParams.includes(item.param) && typeof item.to === 'number');
          if (validated.length > 0) {
            return res.json({
              suggestions: validated,
              provider: llmResult.provider,
              fallback: false
            });
          }
        }
      } catch (parseErr) {
        console.warn('Failed to parse Make-It-Better JSON:', parseErr.message);
      }
    }

    // Rule-based fallback suggestions
    const fallbackSuggestions = generateRuleBasedMakeItBetter(stateObject);
    return res.json({
      suggestions: fallbackSuggestions,
      provider: 'rule-engine',
      fallback: true
    });
  } catch (err) {
    console.error('Error in /api/ai/make-it-better:', err);
    return res.json({
      suggestions: generateRuleBasedMakeItBetter(req.body?.stateObject || {}),
      provider: 'rule-engine',
      fallback: true
    });
  }
});

/**
 * POST /api/ai/challenge
 * Returns a design challenge with specific constraints
 */
app.post('/api/ai/challenge', (req, res) => {
  const randomChallenge = CHALLENGE_PRESETS[Math.floor(Math.random() * CHALLENGE_PRESETS.length)];
  res.json({
    success: true,
    challenge: {
      id: randomChallenge.id,
      title: randomChallenge.title,
      description: randomChallenge.description,
      difficulty: randomChallenge.difficulty,
      xp: randomChallenge.xp,
      requirements: randomChallenge.requirements.map(r => ({ id: r.id, text: r.text }))
    }
  });
});

/**
 * POST /api/ai/check-challenge
 * Validates canvas state against challenge requirements
 */
app.post('/api/ai/check-challenge', (req, res) => {
  const { challengeId, stateObject } = req.body;
  const challenge = CHALLENGE_PRESETS.find(c => c.id === challengeId) || CHALLENGE_PRESETS[0];

  const results = challenge.requirements.map(reqItem => {
    let passed = false;
    try {
      passed = reqItem.check(stateObject || {});
    } catch (e) {
      passed = false;
    }
    return { id: reqItem.id, text: reqItem.text, passed };
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const completed = passedCount === totalCount;
  const score = Math.round((passedCount / totalCount) * 100);

  let feedback = '';
  if (completed) {
    feedback = `🎉 Incredible work! You nailed all ${totalCount} challenge constraints. +${challenge.xp} XP awarded!`;
  } else {
    feedback = `Good progress! You've satisfied ${passedCount}/${totalCount} requirements. Check the pending items to complete the challenge!`;
  }

  res.json({
    challengeId: challenge.id,
    title: challenge.title,
    completed,
    score,
    passedCount,
    totalCount,
    requirements: results,
    feedback,
    xpEarned: completed ? challenge.xp : Math.round(challenge.xp * (passedCount / totalCount) * 0.3)
  });
});

/**
 * POST /api/feedback/log
 * Analytics log for accepted vs dismissed AI recommendations
 */
app.post('/api/feedback/log', (req, res) => {
  const { action, suggestionId, param, from, to, personality } = req.body;
  feedbackLog.push({
    timestamp: new Date().toISOString(),
    action, // 'apply' | 'dismiss'
    suggestionId,
    param,
    from,
    to,
    personality
  });
  if (feedbackLog.length > 500) feedbackLog.shift();
  res.json({ success: true, count: feedbackLog.length });
});

/**
 * POST /api/auth/register
 * User registration endpoint supporting name, username, email, password
 */
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  const name = (req.body.name || req.body.username || '').trim();

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const user = {
    id: 'user_' + Date.now(),
    name: name || email.split('@')[0],
    email: email.trim().toLowerCase(),
    token: 'jwt_mock_' + Buffer.from(email + ':' + Date.now()).toString('base64'),
    createdAt: new Date().toISOString()
  };

  console.log(`✓ User registered: ${user.name} (${user.email})`);
  res.json({ success: true, user, token: user.token, message: 'Registration successful! Welcome to Pux Pilot.' });
});

/**
 * POST /api/auth/login
 * User login endpoint
 */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const user = {
    id: 'user_' + Date.now(),
    name: email.split('@')[0],
    email: email.trim().toLowerCase(),
    token: 'jwt_mock_' + Buffer.from(email + ':' + Date.now()).toString('base64'),
    lastLogin: new Date().toISOString()
  };

  console.log(`✓ User logged in: ${user.email}`);
  res.json({ success: true, user, token: user.token, message: 'Welcome back!' });
});

/**
 * POST /api/ai/match-style
 * "Match This Vibe" style matching endpoint combining quantitative pixel stats + vision analysis
 */
app.post('/api/ai/match-style', async (req, res) => {
  try {
    const { targetImage, referenceImage, extractedStats = {} } = req.body;
    
    // Quantitative base recipe calculation
    const ref = extractedStats.reference || {};
    const tgt = extractedStats.target || {};

    // Compute delta-based slider recipe
    const lumDelta = (ref.lightness !== undefined && tgt.lightness !== undefined) ? Math.round((ref.lightness - tgt.lightness) * 0.7) : 0;
    const satDelta = (ref.saturation !== undefined && tgt.saturation !== undefined) ? Math.round((ref.saturation - tgt.saturation) * 0.8) : 15;
    const tempDelta = (ref.temperature !== undefined && tgt.temperature !== undefined) ? Math.round((ref.temperature - tgt.temperature) * 0.9) : 20;
    const tintDelta = (ref.tint !== undefined && tgt.tint !== undefined) ? Math.round((ref.tint - tgt.tint) * 0.8) : 0;
    const conDelta = (ref.contrast !== undefined && tgt.contrast !== undefined) ? Math.round((ref.contrast - tgt.contrast) * 0.75) : 18;
    const vignetteVal = ref.vignette ? Math.round(ref.vignette) : 22;
    const sharpnessVal = ref.grain ? Math.min(40, Math.round(ref.grain * 1.5)) : 18;

    const baseRecipe = {
      brightness: Math.max(-50, Math.min(50, lumDelta)),
      contrast: Math.max(-50, Math.min(60, conDelta)),
      saturation: Math.max(-60, Math.min(60, satDelta)),
      exposure: Math.max(-40, Math.min(40, Math.round(lumDelta * 0.5))),
      temperature: Math.max(-70, Math.min(70, tempDelta)),
      tint: Math.max(-50, Math.min(50, tintDelta)),
      vignette: Math.max(0, Math.min(80, vignetteVal)),
      sharpness: Math.max(0, Math.min(60, sharpnessVal))
    };

    // Educational explanation explaining color/light choices
    const moodDesc = ref.temperature > 15 ? 'warm golden filmic' : (ref.temperature < -15 ? 'cool moody cyberpunk' : 'balanced editorial');
    const contrastDesc = baseRecipe.contrast > 15 ? 'punchy deep dynamic range' : 'soft matte tonal roll-off';
    const explanation = `Vibe Matched: Extracted a ${moodDesc} color palette with ${contrastDesc}. Shifted color temperature (${baseRecipe.temperature > 0 ? '+' : ''}${baseRecipe.temperature}) and balanced contrast (${baseRecipe.contrast > 0 ? '+' : ''}${baseRecipe.contrast}) to recreate the reference lighting atmosphere without compromising subject clarity.`;

    // If Gemini Vision or LLM is available, attempt qualitative refinement
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && targetImage && referenceImage && targetImage.startsWith('data:image') && referenceImage.startsWith('data:image')) {
      try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const targetClean = targetImage.split(',')[1];
        const refClean = referenceImage.split(',')[1];

        const prompt = `You are a master colorist and art director. Look at the reference image (image 2) and describe its photographic style (color grading, tone, lighting mood, contrast, grain). Return a JSON object with:
{
  "recipe": {
    "brightness": <number -50 to 50>,
    "contrast": <number -50 to 60>,
    "saturation": <number -60 to 60>,
    "exposure": <number -40 to 40>,
    "temperature": <number -70 to 70>,
    "tint": <number -50 to 50>,
    "vignette": <number 0 to 80>,
    "sharpness": <number 0 to 60>
  },
  "explanation": "<2 concise sentences explaining why these slider choices recreate the reference aesthetic>"
}
Return ONLY valid JSON.`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey.trim()
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: targetClean } },
                { inlineData: { mimeType: 'image/jpeg', data: refClean } }
              ]
            }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
          }),
          signal: AbortSignal.timeout(9000)
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
          if (parsed.recipe && parsed.explanation) {
            return res.json({
              recipe: { ...baseRecipe, ...parsed.recipe },
              explanation: parsed.explanation,
              provider: 'gemini-vision',
              fallback: false
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini vision style match failed, using quantitative recipe:', geminiErr.message);
      }
    }

    // Default quantitative recipe response
    return res.json({
      recipe: baseRecipe,
      explanation,
      provider: 'rule-engine-quantitative',
      fallback: true
    });
  } catch (err) {
    console.error('Error in /api/ai/match-style:', err);
    res.status(500).json({ error: 'Failed to process style match' });
  }
});

// Fallback route for SPA index.html
app.get('*', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the local server. Keep a reference so startup errors are reported clearly
// instead of crashing with an unhandled EventEmitter error.
const server = app.listen(PORT, HOST, () => {
  console.log(`========================================================`);
  console.log(`🚁 PUX PILOT — AI Co-Pilot Photo Editor`);
  console.log(`🚀 Server running on:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://127.0.0.1:${PORT}`);
  console.log(`⚡ Providers active:`);
  console.log(`   - Groq: ${process.env.GROQ_API_KEY ? 'Enabled (Primary)' : 'Disabled'}`);
  console.log(`   - OpenRouter: ${process.env.OPENROUTER_API_KEY ? 'Enabled (Secondary)' : 'Disabled'}`);
  console.log(`   - Gemini Flash: ${process.env.GEMINI_API_KEY ? 'Enabled (Multimodal)' : 'Disabled'}`);
  console.log(`   - Local Rule Engine: Enabled (Always-On Instant Fallback)`);
  console.log(`========================================================`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Stop the other server or set PORT to another value in .env.`);
  } else if (error.code === 'EACCES') {
    console.error(`\nPermission was denied while starting http://${HOST}:${PORT}. Try a different PORT (for example 3001), or check your local firewall/security policy.`);
  } else {
    console.error('\nUnable to start the local server:', error);
  }
  process.exitCode = 1;
});
