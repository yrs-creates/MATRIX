/**
 * PUX PILOT — Master Application Coordinator
 * Coordinates Onboarding with Cat/Dog Memes, Friddyy's emotion system,
 * Live Adjustments, Filter Presets, Multi-layer Canvas, AI Chat, Auth,
 * Add People (Compositor), Match This Vibe (Style Matcher), and Auto-Activity Feed.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Global Engines
  window.Gamification = new GamificationEngine();
  if (typeof CreativeFingerprintChart === 'function') {
    window.RadarChart = new CreativeFingerprintChart('radar-canvas');
  }
  window.Mascot = new PilotMascot('mascot-container');
  window.RuleEngine = new DesignRuleEngine();
  window.AI = new AIClient();
  window.CanvasEngine = new CanvasEngine('main-canvas', 'canvas-container');

  if (typeof StyleMatcher === 'function') {
    window.StyleMatcherEngine = new StyleMatcher();
  }
  if (typeof PersonCompositor === 'function') {
    window.PersonCompositorEngine = new PersonCompositor();
  }

  // 2. Initialize Subsystems
  initAuthUI();
  initOnboarding();
  initSliders();
  initTools();
  initDrawerTabs();
  initPresetFilters();
  initPersonCompositorUI();
  initStyleMatcherUI();
  initAICoPilot();
  initLayersUI();
  initExportModal();
  initShortcuts();
  initStarterImage();
  initAutoEventSubscription();

  // Initial UI refresh
  if (window.Gamification) {
    window.Gamification.updateUI();
  }
  checkStoredUser();
});

/* ==========================================================================
   1. AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */

let authMode = 'register'; // 'register' | 'login'

function initAuthUI() {
  const toggleBtn = document.getElementById('auth-toggle-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode(authMode === 'register' ? 'login' : 'register');
    });
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const title = document.getElementById('auth-card-title');
  const subtitle = document.getElementById('auth-card-subtitle');
  const userField = document.getElementById('auth-username-field');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleBtn = document.getElementById('auth-toggle-mode');
  const errorMsg = document.getElementById('auth-error-msg');

  if (errorMsg) errorMsg.classList.add('hidden');

  if (mode === 'login') {
    if (title) title.innerText = 'Welcome Back to Pux Pilot';
    if (subtitle) subtitle.innerText = 'Sign in to access your creative studio and saved presets.';
    if (userField) userField.classList.add('hidden');
    if (submitBtn) submitBtn.innerHTML = `<span>Sign In</span><iconify-icon icon="lucide:arrow-right"></iconify-icon>`;
    if (toggleBtn) toggleBtn.innerText = "Don't have an account? Create one →";
  } else {
    if (title) title.innerText = 'Welcome to Pux Pilot';
    if (subtitle) subtitle.innerText = 'Your minimal, AI-assisted creative photo studio with Friddyy.';
    if (userField) userField.classList.remove('hidden');
    if (submitBtn) submitBtn.innerHTML = `<span>Create Account</span><iconify-icon icon="lucide:arrow-right"></iconify-icon>`;
    if (toggleBtn) toggleBtn.innerText = 'Already have an account? Sign In →';
  }
}

async function handleAuthSubmit(event) {
  if (event) event.preventDefault();
  const errorEl = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('auth-submit-btn');

  const username = (document.getElementById('reg-username')?.value || '').trim();
  const email = (document.getElementById('reg-email')?.value || '').trim();
  const password = (document.getElementById('reg-pass')?.value || '').trim();

  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.innerText = '';
  }

  // Client-side validation
  if (!email || !email.includes('@')) {
    showAuthError('Please provide a valid email address.');
    return;
  }
  if (!password || password.length < 4) {
    showAuthError('Password must be at least 4 characters long.');
    return;
  }
  if (authMode === 'register' && !username) {
    showAuthError('Please choose a username.');
    return;
  }

  // Loading state
  const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin text-lg"></iconify-icon> <span>Connecting...</span>`;
  }

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const payload = { name: username, username, email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const msg = data.error || data.message || `Authentication failed (${res.status})`;
      showAuthError(msg);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
      return;
    }

    // Success! Save session
    localStorage.setItem('pux_user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('pux_token', data.token);

    updateUserBadge(data.user);

    if (authMode === 'register') {
      showQuiz();
    } else {
      enterEditor();
    }
  } catch (err) {
    console.error('Auth network error:', err);
    showAuthError('Network error connecting to auth server. Please check that server is running.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}

function showAuthError(message) {
  const errorEl = document.getElementById('auth-error-msg');
  if (errorEl) {
    errorEl.innerText = message;
    errorEl.classList.remove('hidden');
    errorEl.classList.add('pop-in');
  }
}

function checkStoredUser() {
  try {
    const stored = localStorage.getItem('pux_user');
    if (stored) {
      const user = JSON.parse(stored);
      updateUserBadge(user);
    }
  } catch (e) {}
}

function updateUserBadge(user) {
  const badge = document.getElementById('user-profile-badge');
  if (badge && user) {
    badge.innerText = user.name || user.email.split('@')[0];
    badge.title = `Signed in as ${user.email}`;
  }
}

/* ==========================================================================
   2. ONBOARDING & MATH MEMES FLOW
   ========================================================================== */

function initOnboarding() {
  const hasOnboarded = localStorage.getItem('pux_pilot_onboarded');
  const onboardingView = document.getElementById('onboarding-view');
  const editorView = document.getElementById('editor-view');

  if (hasOnboarded === 'true' && onboardingView && editorView) {
    onboardingView.classList.add('hidden');
    editorView.classList.remove('hidden');
    return;
  }
}

function showQuiz() {
  const reg = document.getElementById('registration-card');
  const quiz = document.getElementById('quiz-card');
  if (reg) reg.classList.add('hidden');
  if (quiz) {
    quiz.classList.remove('hidden');
    quiz.classList.add('pop-in');
  }
  if (window.Gamification) window.Gamification.playSound('click');
}

function answerQuiz(correct) {
  const quiz = document.getElementById('quiz-card');
  const rightAns = document.getElementById('right-ans-card');
  const wrongAns = document.getElementById('wrong-ans-card');

  if (quiz) quiz.classList.add('hidden');

  if (correct) {
    if (rightAns) {
      rightAns.classList.remove('hidden');
      rightAns.classList.add('pop-in');
    }
    if (window.Gamification) {
      window.Gamification.unlockAchievement('genius_math');
      window.Gamification.addXP(50, 'Passed Math Genius Verification');
      window.Gamification.playSound('sparkle');
    }
  } else {
    if (wrongAns) {
      wrongAns.classList.remove('hidden');
      wrongAns.classList.add('pop-in');
    }
    if (window.Gamification) {
      window.Gamification.playSound('flinch');
    }
  }
}

function enterEditor() {
  const onboardingView = document.getElementById('onboarding-view');
  const editorView = document.getElementById('editor-view');

  if (onboardingView) onboardingView.classList.add('hidden');
  if (editorView) {
    editorView.classList.remove('hidden');
    editorView.classList.add('pop-in');
  }

  localStorage.setItem('pux_pilot_onboarded', 'true');

  if (window.Gamification) {
    window.Gamification.unlockAchievement('first_flight');
    window.Gamification.addXP(25, 'Entered Creative Studio');
    window.Gamification.playSound('badge');
  }

  if (window.Mascot) {
    window.Mascot.setEmotion('happy', "Welcome aboard! Nyaa~ let's create something magnificent! ✨", 4000);
  }

  setTimeout(() => {
    initStarterImage();
    if (window.CanvasEngine) window.CanvasEngine.render();
  }, 100);
}

function initStarterImage() {
  if (window.CanvasEngine && !window.CanvasEngine.hasImage) {
    const starterUrl = 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?q=80&w=1200';
    window.CanvasEngine.loadImage(starterUrl).catch(() => {
      if (window.SampleImages) {
        window.CanvasEngine.loadImage(SampleImages.getCyberpunkStreet());
      }
    });
  }
}

/* ==========================================================================
   3. AUTO AI CO-PILOT ACTIVITY FEED & RULE SUBSCRIPTION
   ========================================================================== */

let autoFeedDebounce = null;

function initAutoEventSubscription() {
  window.addEventListener('pux:state-changed', (e) => {
    const { action, detail, state } = e.detail || {};

    clearTimeout(autoFeedDebounce);
    autoFeedDebounce = setTimeout(() => {
      handleAutoCoPilotReaction(action, detail, state);
    }, 450);
  });
}

function handleAutoCoPilotReaction(action, detail, state) {
  if (!state || !window.RuleEngine) return;

  const personality = window.Mascot ? window.Mascot.personality : 'friendly';
  const roastLevel = window.Mascot ? window.Mascot.roastLevel : 3;

  // 1. Evaluate design rules live
  const evaluation = window.RuleEngine.evaluate(state, personality, roastLevel);

  // Update top diagnostic log
  updateAIDiagnosticStream(evaluation, state);

  // 2. If an active design mistake triggered, pushToActivityFeed in rules.js already posted it.
  // If no design violation occurred, generate a contextual action comment!
  if (!evaluation.activeMistakes || evaluation.activeMistakes.length === 0) {
    const comment = window.RuleEngine.generateActionFeedback(action, detail, state, personality, roastLevel);
    if (comment) {
      appendChatBubble('bot', comment);
      if (window.Mascot) {
        window.Mascot.speak(comment, 3500);
      }
    }
  }
}

function updateAIDiagnosticStream(evaluation, state) {
  const diagEl = document.getElementById('ai-diag-stream');
  if (!diagEl) return;

  const mistakes = evaluation?.activeMistakes || [];
  if (mistakes.length > 0) {
    const top = mistakes[0];
    diagEl.innerHTML = `
      <div class="text-blue-600 font-bold">[AI ANALYZING] Active Design Evaluation</div>
      <div class="text-amber-500 font-medium">⚠️ ${top.issue}</div>
      <div class="text-slate-600">💡 <strong>Fix:</strong> ${top.fix}</div>
    `;
    if (top.targetSelector && window.Mascot) {
      window.Mascot.pointAt(top.targetSelector, top.phrasedFeedback);
    }
  } else {
    diagEl.innerHTML = `
      <div class="text-blue-600 font-bold">[AI ANALYZING] Balanced Parameters</div>
      <div class="text-green-600">✓ Chromatic and contrast levels within aesthetic sweet spot.</div>
      <div class="text-slate-400">Rule of thirds and dynamic range balanced.</div>
    `;
  }
}

/* ==========================================================================
   4. ADJUSTMENT SLIDERS & LIVE UPDATES
   ========================================================================== */

function initSliders() {
  const sliderMap = [
    { id: 'slider-brightness', param: 'brightness', badgeId: 'val-brightness' },
    { id: 'slider-contrast', param: 'contrast', badgeId: 'val-contrast' },
    { id: 'slider-saturation', param: 'saturation', badgeId: 'val-saturation' },
    { id: 'slider-temp', param: 'temperature', badgeId: 'val-temp' },
    { id: 'slider-tint', param: 'tint', badgeId: 'val-tint' },
    { id: 'slider-blur', param: 'blur', badgeId: 'val-blur' },
    { id: 'slider-vignette', param: 'vignette', badgeId: 'val-vignette' },
    { id: 'slider-sharpness', param: 'sharpness', badgeId: 'val-sharpness' },
    { id: 'slider-exposure', param: 'exposure', badgeId: 'val-exposure' },
    { id: 'slider-highlights', param: 'highlights', badgeId: 'val-highlights' },
    { id: 'slider-shadows', param: 'shadows', badgeId: 'val-shadows' }
  ];

  sliderMap.forEach(({ id, param, badgeId }) => {
    const el = document.getElementById(id);
    const badge = document.getElementById(badgeId);
    if (!el) return;

    el.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (badge) badge.innerText = val > 0 ? `+${val}` : val;

      if (window.CanvasEngine) {
        window.CanvasEngine.adjustments[param] = val;
        window.CanvasEngine.render();
        window.CanvasEngine.notifyStateChanged('adjustment_change', { param, value: val });
      }

      if (Math.abs(val) >= 90 && window.Mascot) {
        window.Mascot.flinch(`Whoa! ${param.toUpperCase()} is pushed to the maximum limit!`);
      }
    });
  });
}

function resetAllAdjustments() {
  if (!window.CanvasEngine) return;
  const defaults = {
    brightness: 0, contrast: 0, saturation: 0, temperature: 0,
    tint: 0, blur: 0, vignette: 0, sharpness: 0, exposure: 0,
    highlights: 0, shadows: 0
  };

  window.CanvasEngine.adjustments = { ...defaults };
  window.CanvasEngine.filter = 'none';
  window.CanvasEngine.render();
  window.CanvasEngine.notifyStateChanged('reset_adjustments', {});

  Object.keys(defaults).forEach(key => {
    const el = document.getElementById(`slider-${key === 'temperature' ? 'temp' : key}`);
    const badge = document.getElementById(`val-${key === 'temperature' ? 'temp' : key}`);
    if (el) el.value = 0;
    if (badge) badge.innerText = '0';
  });

  if (window.Mascot) {
    window.Mascot.setEmotion('happy', 'All adjustments reset to neutral baseline! 🧼');
  }
}

/* ==========================================================================
   5. LEFT SIDEBAR TOOLS (SELECT, CROP, ROTATE, TEXT, SHAPES, STICKERS, BRUSH, UPLOAD)
   ========================================================================== */

function initTools() {
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-200'));
      btn.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-200');

      const toolType = btn.getAttribute('data-tool');
      if (window.CanvasEngine) {
        window.CanvasEngine.activeTool = toolType;
      }
      handleToolSwitch(toolType);
    });
  });
}

// These are intentionally global because the application shell uses inline
// onclick handlers for the toolbar buttons.
function triggerUpload() {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/png,image/jpeg,image/webp,image/gif';

  picker.addEventListener('change', () => {
    const file = picker.files && picker.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file (PNG, JPG, WebP, or GIF).');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      try {
        await window.CanvasEngine.loadImage(reader.result);
        updateLayersList();
        appendChatBubble('bot', `Ooh, fresh canvas! ${file.name} is loaded—give me one bold edit and I'll tell you exactly how to make it pop. ✨`);
        if (window.Mascot) window.Mascot.setEmotion('happy', `New image loaded: ${file.name}!`);
      } catch (error) {
        console.error('Image import failed:', error);
        alert('That image could not be loaded. Please try a different file.');
      }
    });
    reader.readAsDataURL(file);
  });

  picker.click();
}

function botCelebrate() {
  if (window.Mascot) window.Mascot.botCelebrate();
}

function botRoast() {
  if (!window.Mascot) return;
  const phrases = window.Mascot.ROAST_PHRASES || [];
  const phrase = phrases.length ? phrases[Math.floor(Math.random() * phrases.length)] : 'That edit is so bold the undo button is hiding. 🔥 Give me another slider move—I dare you.';
  window.Mascot.botRoast();
  appendChatBubble('bot', phrase);
}

function botJoke() {
  if (!window.Mascot) return;
  const jokes = window.Mascot.JOKES || [];
  const joke = jokes.length ? jokes[Math.floor(Math.random() * jokes.length)] : 'Why did the designer bring a ladder? To reach the next level! 😄';
  window.Mascot.botJoke();
  appendChatBubble('bot', joke);
}

function handleToolSwitch(toolType) {
  const subpanel = document.getElementById('tool-subpanel');
  if (!subpanel) return;

  if (toolType === 'crop') {
    subpanel.classList.remove('hidden');
    subpanel.innerHTML = `
      <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
        <span>Crop Aspect Ratio</span>
        <button onclick="closeToolSubpanel()" class="text-slate-400 hover:text-slate-600"><iconify-icon icon="lucide:x"></iconify-icon></button>
      </div>
      <div class="grid grid-cols-3 gap-1.5 mb-3">
        <button onclick="setCropRatio(null)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">Free</button>
        <button onclick="setCropRatio(1)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">1:1</button>
        <button onclick="setCropRatio(16/9)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">16:9</button>
        <button onclick="setCropRatio(4/5)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">4:5</button>
        <button onclick="setCropRatio(9/16)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">9:16</button>
        <button onclick="setCropRatio(3/2)" class="px-2 py-1 text-[11px] font-semibold bg-slate-50 border rounded hover:bg-blue-50">3:2</button>
      </div>
      <div class="flex gap-2">
        <button onclick="applyCrop()" class="flex-1 bg-blue-600 text-white text-xs font-semibold py-1.5 rounded hover:bg-blue-700">Apply Crop</button>
        <button onclick="cancelCrop()" class="px-3 bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 rounded hover:bg-slate-200">Cancel</button>
      </div>
    `;
    if (window.CanvasEngine) window.CanvasEngine.startCrop();
  } else if (toolType === 'text') {
    subpanel.classList.remove('hidden');
    subpanel.innerHTML = `
      <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
        <span>Add Typography</span>
        <button onclick="closeToolSubpanel()" class="text-slate-400 hover:text-slate-600"><iconify-icon icon="lucide:x"></iconify-icon></button>
      </div>
      <input type="text" id="new-text-input" placeholder="Type text here..." value="CREATE MAGIC ✨" class="w-full px-3 py-1.5 text-xs bg-slate-50 border rounded mb-2 outline-none">
      <div class="flex gap-2 mb-3">
        <input type="color" id="new-text-color" value="#ffffff" class="w-8 h-8 rounded border cursor-pointer" title="Font Color">
        <select id="new-text-font" class="flex-1 text-xs bg-slate-50 border rounded px-2">
          <option value="'Outfit', sans-serif">Outfit</option>
          <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="Impact, sans-serif">Impact / Bold</option>
        </select>
      </div>
      <button onclick="addTextLayerFromPanel()" class="w-full bg-slate-900 text-white text-xs font-semibold py-2 rounded hover:bg-slate-800">Add Text Layer</button>
    `;
  } else if (toolType === 'shapes') {
    subpanel.classList.remove('hidden');
    subpanel.innerHTML = `
      <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
        <span>Shapes & Elements</span>
        <button onclick="closeToolSubpanel()" class="text-slate-400 hover:text-slate-600"><iconify-icon icon="lucide:x"></iconify-icon></button>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-2">
        <button onclick="addShapeLayer('rect')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">⬛ Box</button>
        <button onclick="addShapeLayer('circle')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">⚪ Circle</button>
        <button onclick="addShapeLayer('star')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">⭐ Star</button>
        <button onclick="addShapeLayer('badge')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">🏷️ Badge</button>
        <button onclick="addShapeLayer('line')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">➖ Line</button>
        <button onclick="addShapeLayer('arrow')" class="p-2 border rounded hover:bg-blue-50 text-center font-bold text-xs">➡️ Arrow</button>
      </div>
    `;
  } else if (toolType === 'stickers') {
    // STICKER TOOL MUST STAY EXACTLY AS IS
    subpanel.classList.remove('hidden');
    subpanel.innerHTML = `
      <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
        <span>Stickers & Emojis</span>
        <button onclick="closeToolSubpanel()" class="text-slate-400 hover:text-slate-600"><iconify-icon icon="lucide:x"></iconify-icon></button>
      </div>
      <div class="grid grid-cols-4 gap-2 text-xl text-center">
        <button onclick="addStickerLayer('✨')" class="p-2 border rounded hover:bg-blue-50">✨</button>
        <button onclick="addStickerLayer('🔥')" class="p-2 border rounded hover:bg-blue-50">🔥</button>
        <button onclick="addStickerLayer('🚀')" class="p-2 border rounded hover:bg-blue-50">🚀</button>
        <button onclick="addStickerLayer('👾')" class="p-2 border rounded hover:bg-blue-50">👾</button>
        <button onclick="addStickerLayer('👑')" class="p-2 border rounded hover:bg-blue-50">👑</button>
        <button onclick="addStickerLayer('💖')" class="p-2 border rounded hover:bg-blue-50">💖</button>
        <button onclick="addStickerLayer('🌸')" class="p-2 border rounded hover:bg-blue-50">🌸</button>
        <button onclick="addStickerLayer('⚡')" class="p-2 border rounded hover:bg-blue-50">⚡</button>
      </div>
    `;
  } else if (toolType === 'brush') {
    subpanel.classList.remove('hidden');
    subpanel.innerHTML = `
      <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
        <span>Brush & Draw</span>
        <button onclick="closeToolSubpanel()" class="text-slate-400 hover:text-slate-600"><iconify-icon icon="lucide:x"></iconify-icon></button>
      </div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <label class="text-[11px] font-bold text-slate-500 w-12">Color:</label>
          <input type="color" id="brush-color" value="#3b82f6" onchange="updateBrushSettings()" class="w-7 h-7 rounded border cursor-pointer">
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] font-bold text-slate-500 w-12">Size:</label>
          <input type="range" id="brush-size" min="2" max="60" value="12" oninput="updateBrushSettings()" class="flex-1">
        </div>
      </div>
    `;
  } else {
    subpanel.classList.add('hidden');
  }
}

function closeToolSubpanel() {
  const subpanel = document.getElementById('tool-subpanel');
  if (subpanel) subpanel.classList.add('hidden');
}

function triggerRotate() {
  if (window.CanvasEngine) {
    window.CanvasEngine.rotate(90);
    if (window.Mascot) window.Mascot.botSmile();
  }
}

function triggerUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (window.CanvasEngine) {
          window.CanvasEngine.loadImage(ev.target.result);
          if (window.Mascot) {
            window.Mascot.setEmotion('happy', "Uploaded new canvas artwork! Let's elevate it! 🎨");
          }
          if (window.Gamification) {
            window.Gamification.addXP(20, 'Loaded New Image');
          }
          updateLayersList();
        }
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function setCropRatio(ratio) {
  if (window.CanvasEngine) {
    window.CanvasEngine.cropAspectRatio = ratio;
    window.CanvasEngine.render();
  }
}

function applyCrop() {
  if (window.CanvasEngine) {
    window.CanvasEngine.applyCrop();
    closeToolSubpanel();
    if (window.Mascot) window.Mascot.botCelebrate();
  }
}

function cancelCrop() {
  if (window.CanvasEngine) {
    window.CanvasEngine.cancelCrop();
    closeToolSubpanel();
  }
}

function addTextLayerFromPanel() {
  const textInput = document.getElementById('new-text-input');
  const colorInput = document.getElementById('new-text-color');
  const fontInput = document.getElementById('new-text-font');

  const text = textInput ? textInput.value : 'Creative Text';
  const color = colorInput ? colorInput.value : '#ffffff';
  const font = fontInput ? fontInput.value : "'Outfit', sans-serif";

  if (window.CanvasEngine) {
    window.CanvasEngine.addTextLayer(text, { color, font, fontSize: 48 });
    updateLayersList();
    if (window.Mascot) window.Mascot.botReact('typography');
    if (window.Gamification) window.Gamification.unlockAchievement('type_titan');
  }
}

function addShapeLayer(shapeType) {
  if (window.CanvasEngine) {
    window.CanvasEngine.addShapeLayer(shapeType, { color: '#3b82f6' });
    updateLayersList();
    if (window.Mascot) window.Mascot.botSmile();
  }
}

function addStickerLayer(emoji) {
  if (window.CanvasEngine) {
    window.CanvasEngine.addStickerLayer(emoji);
    updateLayersList();
    if (window.Mascot) window.Mascot.botReact('sticker');
  }
}

function updateBrushSettings() {
  const color = document.getElementById('brush-color')?.value || '#3b82f6';
  const size = parseInt(document.getElementById('brush-size')?.value || '12', 10);
  if (window.CanvasEngine) {
    window.CanvasEngine.brush.color = color;
    window.CanvasEngine.brush.size = size;
  }
}

/* ==========================================================================
   6. DRAWER TABS, PRESET FILTERS, PERSON COMPOSITOR & STYLE MATCHER
   ========================================================================== */

function initDrawerTabs() {
  const tabs = document.querySelectorAll('.drawer-tab-btn');
  const contents = document.querySelectorAll('.drawer-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      tabs.forEach(t => {
        t.classList.remove('text-blue-600', 'border-blue-600');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('text-blue-600', 'border-blue-600');
      tab.classList.remove('text-slate-400');

      contents.forEach(c => {
        if (c.id === targetId) {
          c.classList.remove('hidden');
          c.classList.add('pop-in');
        } else {
          c.classList.add('hidden');
        }
      });
    });
  });
}

function initPresetFilters() {
  const filterList = [
    { id: 'none', name: 'Normal', tag: 'Original Clean', icon: '☀️' },
    { id: 'cyberpunk', name: 'Cyberpunk', tag: 'Neon Teal & Magenta', icon: '🌆' },
    { id: 'film_noir', name: 'Film Noir', tag: 'High Contrast B&W', icon: '🎬' },
    { id: 'pastel_anime', name: 'Pastel Anime', tag: 'Soft Kawaii Dream', icon: '🌸' },
    { id: 'sunset_warmth', name: 'Sunset Warmth', tag: 'Golden Amber Glow', icon: '🌅' },
    { id: 'vintage_90s', name: 'Vintage 90s', tag: 'Faded Film Matte', icon: '🎞️' },
    { id: 'neon_tokyo', name: 'Neon Tokyo', tag: 'Ultra High Vibrance', icon: '🗼' },
    { id: 'golden_hour', name: 'Golden Hour', tag: 'Sunlit Radiance', icon: '✨' },
    { id: 'moody_forest', name: 'Moody Forest', tag: 'Deep Emerald Tone', icon: '🌲' },
    { id: 'clean_studio', name: 'Clean Studio', tag: 'Crisp Editorial Look', icon: '📸' }
  ];

  const container = document.getElementById('filters-grid');
  if (!container) return;

  container.innerHTML = filterList.map(f => `
    <div onclick="applyPresetFilter('${f.id}')" class="filter-thumb-card p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 group flex flex-col items-center text-center">
      <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">${f.icon}</div>
      <div class="text-xs font-bold text-slate-800">${f.name}</div>
      <div class="text-[10px] text-slate-400">${f.tag}</div>
    </div>
  `).join('');
}

function applyPresetFilter(filterId) {
  if (window.CanvasEngine) {
    window.CanvasEngine.setFilter(filterId);
    if (window.Mascot) {
      window.Mascot.setEmotion('happy', `Applied ${filterId.replace('_', ' ').toUpperCase()} preset filter! ✨`);
    }
  }
}

function initPersonCompositorUI() {
  const container = document.getElementById('drawer-people');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4 max-w-xl">
      <div class="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <input type="checkbox" id="person-consent-check" class="w-4 h-4 accent-blue-600 cursor-pointer">
        <label for="person-consent-check" class="cursor-pointer font-medium">I have permission to edit and composite this person's image (Consent Guardrail).</label>
      </div>

      <div class="flex flex-wrap gap-4 items-center">
        <button onclick="triggerPersonUpload()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-200">
          <iconify-icon icon="lucide:user-plus"></iconify-icon>
          <span>Upload Person Photo</span>
        </button>
        <label class="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
          <input type="checkbox" id="person-harmonize-toggle" checked class="w-4 h-4 accent-blue-600">
          <span>Auto-Harmonize Ambient Lighting</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
          <input type="checkbox" id="person-shadow-toggle" checked class="w-4 h-4 accent-blue-600">
          <span>Soft Contact Shadow</span>
        </label>
      </div>

      <div id="person-status-msg" class="text-xs text-slate-500 font-medium"></div>
    </div>
  `;
}

function triggerPersonUpload() {
  const consent = document.getElementById('person-consent-check')?.checked;
  const statusMsg = document.getElementById('person-status-msg');

  if (!consent) {
    if (statusMsg) statusMsg.innerHTML = `<span class="text-red-500 font-bold">⚠️ Consent required: Please check the permission guardrail box first.</span>`;
    if (window.Mascot) window.Mascot.speak("Please check the consent box before adding portraits! 🛡️");
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (statusMsg) statusMsg.innerHTML = `<span class="text-blue-600 font-bold">⏳ Segmenting portrait subject locally...</span>`;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let cutoutData = null;
        if (window.PersonCompositorEngine) {
          cutoutData = await window.PersonCompositorEngine.isolatePerson(ev.target.result);
        }

        const img = new Image();
        img.onload = () => {
          const harmonize = document.getElementById('person-harmonize-toggle')?.checked !== false;
          const shadow = document.getElementById('person-shadow-toggle')?.checked !== false;

          if (window.CanvasEngine) {
            window.CanvasEngine.addPersonLayer(img, {
              harmonize: { enabled: harmonize, temperature: 15 },
              shadow: { enabled: shadow, color: 'rgba(0, 0, 0, 0.65)', offsetY: 12 }
            });
            updateLayersList();
            if (statusMsg) statusMsg.innerHTML = `<span class="text-green-600 font-bold">✓ Person cutout inserted into canvas with auto-harmonization!</span>`;
            if (window.Mascot) window.Mascot.setEmotion('happy', "Person cutout composited with soft ambient shadow! 👤✨");
          }
        };
        img.src = cutoutData?.cutoutDataUrl || ev.target.result;
      } catch (err) {
        if (statusMsg) statusMsg.innerHTML = `<span class="text-red-500">Failed to process portrait: ${err.message}</span>`;
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function initStyleMatcherUI() {
  const container = document.getElementById('drawer-vibe');
  if (!container) return;

  const vibes = [
    { id: 'cyberpunk', name: 'Cinematic Cyberpunk', tag: 'Neon Teal & Magenta', icon: '🌆', recipe: { temperature: -35, tint: 25, contrast: 30, saturation: 35, vignette: 30 } },
    { id: 'vintage_70s', name: 'Vintage 70s Kodak', tag: 'Warm Amber & Matte Fade', icon: '🎞️', recipe: { temperature: 35, tint: -10, contrast: 15, saturation: -15, vignette: 25 } },
    { id: 'nordic_noir', name: 'Moody Nordic Noir', tag: 'Desaturated & Deep Shadow', icon: '🖤', recipe: { temperature: -20, tint: 0, contrast: 40, saturation: -40, vignette: 40 } },
    { id: 'golden_pastel', name: 'Golden Hour Dream', tag: 'Sunlit Radiance & Glow', icon: '🌅', recipe: { temperature: 28, tint: 12, contrast: -10, saturation: 18, vignette: 15 } }
  ];

  container.innerHTML = `
    <div class="space-y-4 max-w-2xl">
      <div class="text-xs text-slate-500 font-medium">Select a reference look palette or upload a reference image to extract and transfer its color grade.</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${vibes.map(v => `
          <div onclick="applyVibePreset(${JSON.stringify(v.recipe).replace(/"/g, '&quot;')}, '${v.name}')" class="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 text-center group">
            <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">${v.icon}</div>
            <div class="text-xs font-bold text-slate-800">${v.name}</div>
            <div class="text-[10px] text-slate-400">${v.tag}</div>
          </div>
        `).join('')}
      </div>
      <div class="flex items-center gap-3 pt-2">
        <label class="text-xs font-bold text-slate-600">Match Intensity:</label>
        <input type="range" id="vibe-intensity-slider" min="10" max="100" value="80" class="flex-1 accent-blue-600">
        <span id="vibe-intensity-val" class="text-xs font-bold text-blue-600">80%</span>
      </div>
    </div>
  `;

  const slider = document.getElementById('vibe-intensity-slider');
  const val = document.getElementById('vibe-intensity-val');
  if (slider && val) {
    slider.addEventListener('input', (e) => {
      val.innerText = `${e.target.value}%`;
    });
  }
}

function applyVibePreset(recipe, name) {
  if (!window.CanvasEngine) return;
  const intensity = (parseInt(document.getElementById('vibe-intensity-slider')?.value || '80', 10)) / 100;

  for (const [k, v] of Object.entries(recipe)) {
    const scaled = Math.round(v * intensity);
    window.CanvasEngine.adjustments[k] = scaled;
    const el = document.getElementById(`slider-${k === 'temperature' ? 'temp' : k}`);
    const badge = document.getElementById(`val-${k === 'temperature' ? 'temp' : k}`);
    if (el) el.value = scaled;
    if (badge) badge.innerText = scaled > 0 ? `+${scaled}` : scaled;
  }

  window.CanvasEngine.render();
  window.CanvasEngine.notifyStateChanged('vibe_matched', { name, recipe });

  if (window.Mascot) {
    window.Mascot.setEmotion('happy', `Transferred "${name}" look with ${(intensity * 100).toFixed(0)}% intensity! 🎨`);
  }
}

/* ==========================================================================
   7. AI CO-PILOT CHAT & INTENT CLASSIFICATION
   ========================================================================= */

function initAICoPilot() {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleChatMessage();
      }
    });
  }
}

async function handleChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  appendChatBubble('user', message);
  input.value = '';

  const lower = message.toLowerCase();

  // Emotion & Sarcasm Classification
  const rudeWords = ['bad', 'stupid', 'dumb', 'hate', 'ugly', 'suck', 'fail', 'worst', 'trash', 'horrible'];
  const praiseWords = ['love', 'awesome', 'amazing', 'great', 'cute', 'beautiful', 'perfect', 'genius', 'kawaii'];

  if (rudeWords.some(w => lower.includes(w))) {
    if (window.Mascot) window.Mascot.botSad();
    appendChatBubble('bot', "Oh... I'm sorry if something went wrong. 🥺 Let's work together to make your artwork shine!");
    return;
  }

  if (praiseWords.some(w => lower.includes(w))) {
    if (window.Mascot) window.Mascot.botSmile();
    appendChatBubble('bot', "Aww thank you so much! Nyaa~ Your creative energy makes my digital heart sparkle! 💕✨");
    return;
  }

  if (lower.includes('joke') || lower.includes('funny')) {
    botJoke();
    return;
  }

  if (lower.includes('roast') || lower.includes('burn')) {
    botRoast();
    return;
  }

  if (lower.includes('make it weird') || lower.includes('chaos')) {
    runChaosWeird();
    return;
  }

  // Thinking State
  if (window.Mascot) window.Mascot.setEmotion('thinking', "Analyzing canvas parameters... 🤔");

  // Call Backend / Rule Engine
  const state = window.CanvasEngine ? window.CanvasEngine.getState() : {};
  const personality = window.Mascot ? window.Mascot.personality : 'friendly';
  const roastLevel = window.Mascot ? window.Mascot.roastLevel : 3;

  try {
    const res = await window.AI.sendChat(message, state, personality, roastLevel);
    const replyText = res.reply || res.text || "I'm here! Give me an edit, a question, or ask me for a roast. ✨";
    appendChatBubble('bot', replyText);

    if (window.Mascot) {
      const shortSnippet = replyText.length > 80 ? replyText.slice(0, 80) + '...' : replyText;
      window.Mascot.speak(shortSnippet);
    }
  } catch (err) {
    appendChatBubble('bot', "I analyzed your artwork! Try balancing contrast and keeping typography within safe margins for maximum impact! 🎨");
  }
}

function appendChatBubble(sender, text) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = 'flex gap-3 pop-in mb-2';

  if (sender === 'user') {
    bubble.innerHTML = `
      <div class="ml-auto bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[85%] shadow-sm">
        ${escapeHtml(text)}
      </div>
    `;
  } else {
    bubble.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0 text-sm shadow-sm font-bold">
        <iconify-icon icon="lucide:bot"></iconify-icon>
      </div>
      <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed text-slate-700 max-w-[88%] shadow-sm">
        ${escapeHtml(text)}
      </div>
    `;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

function runAnalysis() {
  if (window.Mascot) window.Mascot.botThink();
  if (window.CanvasEngine && window.RuleEngine) {
    const state = window.CanvasEngine.getState();
    const evaluation = window.RuleEngine.evaluate(state, window.Mascot?.personality || 'friendly');
    updateAIDiagnosticStream(evaluation, state);
  }
  appendChatBubble('bot', "🔍 Full Design Audit complete! Evaluated contrast ratio, color temperature balance, and edge proximity.");
}

function runAutoFix() {
  if (!window.CanvasEngine) return;
  window.CanvasEngine.adjustments.contrast = 20;
  window.CanvasEngine.adjustments.saturation = 15;
  window.CanvasEngine.adjustments.vignette = 18;
  window.CanvasEngine.render();
  window.CanvasEngine.notifyStateChanged('autofix_applied', {});

  const cEl = document.getElementById('slider-contrast');
  const sEl = document.getElementById('slider-saturation');
  const vEl = document.getElementById('slider-vignette');
  if (cEl) cEl.value = 20;
  if (sEl) sEl.value = 15;
  if (vEl) vEl.value = 18;

  if (window.Mascot) window.Mascot.botCelebrate();
  appendChatBubble('bot', "✨ Auto-Harmonized! Boosted contrast (+20), balanced saturation (+15), and centered focus (+18 vignette).");
}

function runChaosWeird() {
  if (!window.CanvasEngine) return;
  window.CanvasEngine.adjustments.saturation = 75;
  window.CanvasEngine.adjustments.contrast = 45;
  window.CanvasEngine.adjustments.tint = 35;
  window.CanvasEngine.filter = 'neon_tokyo';
  window.CanvasEngine.render();
  window.CanvasEngine.notifyStateChanged('chaos_activated', {});

  if (window.Mascot) window.Mascot.setEmotion('chaos', "WEIRD MODE ENGAGED! Chromatic overload activated! ⚡👾", 5000);
  if (window.Gamification) window.Gamification.unlockAchievement('chaos_master');
  appendChatBubble('bot', "🌀 MAXIMUM CREATIVE ANARCHY! Hyper-saturated and neon-infused!");
}

/* ==========================================================================
   8. LAYERS UI
   ========================================================================== */

function initLayersUI() {
  updateLayersList();
}

function updateLayersList() {
  const list = document.getElementById('layers-list');
  if (!list || !window.CanvasEngine) return;

  const layers = window.CanvasEngine.layers || [];
  let html = `
    <div class="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
      <div class="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center text-blue-700 text-xs font-bold">BASE</div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold text-slate-800 truncate">Background Artwork</div>
        <div class="text-[10px] text-slate-400">Master Canvas</div>
      </div>
      <iconify-icon icon="lucide:lock" class="text-slate-400 text-sm"></iconify-icon>
    </div>
  `;

  layers.forEach((layer, idx) => {
    html += `
      <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 group hover:border-blue-300">
        <div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 text-xs font-bold uppercase">${layer.type.slice(0, 4)}</div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-slate-800 truncate">${escapeHtml(layer.name || layer.text || layer.type)}</div>
          <div class="text-[10px] text-slate-400">Layer #${idx + 1}</div>
        </div>
        <button onclick="toggleLayerVis('${layer.id}')" class="text-slate-400 hover:text-slate-600" title="Toggle Visibility">
          <iconify-icon icon="${layer.visible === false ? 'lucide:eye-off' : 'lucide:eye'}"></iconify-icon>
        </button>
        <button onclick="deleteLayerById('${layer.id}')" class="text-slate-400 hover:text-red-500" title="Delete Layer">
          <iconify-icon icon="lucide:trash-2"></iconify-icon>
        </button>
      </div>
    `;
  });

  list.innerHTML = html;
}

function toggleLayerVis(id) {
  if (window.CanvasEngine) {
    const l = window.CanvasEngine.layers.find(x => x.id === id);
    if (l) {
      l.visible = l.visible === false ? true : false;
      window.CanvasEngine.render();
      updateLayersList();
    }
  }
}

function deleteLayerById(id) {
  if (window.CanvasEngine) {
    window.CanvasEngine.layers = window.CanvasEngine.layers.filter(x => x.id !== id);
    window.CanvasEngine.render();
    window.CanvasEngine.notifyStateChanged('layer_removed', { id });
    updateLayersList();
    if (window.Mascot) window.Mascot.botSmile();
  }
}

/* ==========================================================================
   9. EXPORT MODAL & SHORTCUTS
   ========================================================================== */

function initExportModal() {}

function toggleExport() {
  const modal = document.getElementById('export-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('pop-in');
  }
  if (window.Mascot) window.Mascot.botCelebrate();
}

function closeExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) modal.classList.add('hidden');
}

function executeExport() {
  const format = document.getElementById('export-format')?.value || 'image/png';
  const scale = parseFloat(document.getElementById('export-scale')?.value || '1');
  const filename = document.getElementById('export-filename')?.value || 'pux-pilot-creation';

  if (window.CanvasEngine) {
    window.CanvasEngine.exportImage(format, scale, 0.95, filename);
    closeExportModal();
    if (window.Mascot) window.Mascot.botCelebrate();
    if (window.Gamification) {
      window.Gamification.unlockAchievement('master_export');
      window.Gamification.addXP(50, 'Rendered Masterpiece Export');
    }
  }
}

function initShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (window.CanvasEngine) window.CanvasEngine.undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      if (window.CanvasEngine) window.CanvasEngine.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      toggleExport();
    }
  });
}

function setPersonalityMode(mode) {
  if (window.Mascot) {
    window.Mascot.setPersonality(mode);
  }
}
