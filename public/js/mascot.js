/**
 * PUX PILOT — Fridii Mascot & Anime Emotion System
 * Coordinates live SVG micro-expressions, tail physics, cheek blushes,
 * personality modes, slider flinches, roast levels, and dynamic speech bubbles.
 */

class PilotMascot {
  constructor(containerId = 'mascot-container') {
    this.containerId = containerId;
    this.personality = 'friendly';
    this.roastLevel = 3;
    this.currentEmotion = 'idle';
    this.idleTimer = null;
    this.emotionResetTimer = null;
    this.speechTimeout = null;

    this.HAPPY_PHRASES = [
      "Nyaa~ that's looking purrfect! ✨",
      "Sugoi! Your creativity is sparkling! 🌟",
      "Kawaii desu! Love that aesthetic energy! 💕",
      "Yatta! That's a stunning adjustment! 🎉",
      "Hehe~ super nice touch right there! 😸",
      "Ooh la la~ très magnifique! ✨",
      "Blush blush~ you're making me so proud! 🥰",
      "Sugoi sugoi! Masterpiece status unlocked! ⭐"
    ];

    this.ROAST_PHRASES = [
      "Ooh, spicy! Hope your monitor has fire insurance! 🔥",
      "That's bold! A bit unhinged, but I respect the bravery! 😎",
      "Did an alien design this or are we just vibing? 👽",
      "My graphics processor just sighed... let's keep going anyway! 💻",
      "Whoa there Picasso, easy on the sliders! 🎨",
      "That contrast is sharper than my morning coffee. Bold move! ☕"
    ];

    this.SAD_PHRASES = [
      "Oh... that was a bit mean... 😢",
      "Did I do something wrong? 🥺",
      "That hurts my little digital heart... 💔",
      "Can we be creative friends again? 🥹",
      "I was just trying to help make art... 😿"
    ];

    this.CELEBRATE_PHRASES = [
      "YATTA! Absolutely magnificent! 🌟",
      "Achievement Unlocked! Masterpiece in the making! 🎉",
      "You're a certified design wizard! 👑",
      "This is pure visual perfection! 💎",
      "I'm so proud of this creative flight! 🌈"
    ];

    this.THINK_PHRASES = [
      "Hmm, analyzing your composition matrix... 💭",
      "Let me calculate the optimal color harmonics... 🤔",
      "Scanning rule of thirds and dynamic balance... 💡",
      "Processing creative vectors... ✨",
      "I have an aesthetic recommendation for you..."
    ];

    this.JOKES = [
      "Why did the designer break up with the developer? Too many layout issues!",
      "What's a photographer's favorite snack? Cheese! 📸",
      "I told a joke about a saturation slider, but it was too intense.",
      "Why did the vector go to therapy? It had too many control points!",
      "How do designers celebrate? They throw a font party! 🎉",
      "Why was the crop tool so good at sports? It always cut to the chase!"
    ];

    this.FridiiEmotions = {
      idle: {
        mouth: 'M45 75 Q50 78 55 75',
        tail: '2s',
        cheekOpacity: '0.6',
        cheekColor: '#fbcfe8',
        eyeClass: 'bot-eye',
        prefix: '[IDLE]',
        prefixClass: 'text-slate-400',
        posture: ''
      },
      happy: {
        mouth: 'M40 75 Q50 82 60 75',
        tail: '1s',
        cheekOpacity: '1',
        cheekColor: '#fbcfe8',
        eyeClass: '',
        prefix: '[HAPPY]',
        prefixClass: 'text-green-500',
        posture: 'animate-bounce-kawaii',
        emoji: '😄'
      },
      roast: {
        mouth: 'M42 75 Q50 78 58 74',
        tail: '2s',
        cheekOpacity: '1',
        cheekColor: '#f472b6',
        eyeClass: '',
        prefix: '[ROAST]',
        prefixClass: 'text-red-500',
        posture: 'roast-posture',
        emoji: '🔥'
      },
      sad: {
        mouth: 'M40 75 Q50 68 60 75',
        tail: '4s',
        cheekOpacity: '0.2',
        cheekColor: '#cbd5e1',
        eyeClass: '',
        prefix: '[SAD]',
        prefixClass: 'text-indigo-400',
        posture: 'depressed-posture',
        emoji: '😢'
      },
      celebrate: {
        mouth: 'M35 75 Q50 95 65 75',
        tail: '0.6s',
        cheekOpacity: '1',
        cheekColor: '#fbcfe8',
        eyeClass: '',
        prefix: '[YATTA!]',
        prefixClass: 'text-pink-500',
        posture: 'animate-bounce-kawaii',
        emoji: '🌟'
      },
      thinking: {
        mouth: 'M45 75 L55 75',
        tail: '3s',
        cheekOpacity: '0.7',
        cheekColor: '#fbcfe8',
        eyeClass: '',
        prefix: '[THINKING]',
        prefixClass: 'text-blue-500',
        posture: '',
        emoji: '🤔'
      },
      chaos: {
        mouth: 'M38 74 Q50 86 62 74',
        tail: '0.4s',
        cheekOpacity: '1',
        cheekColor: '#f59e0b',
        eyeClass: '',
        prefix: '[CHAOS]',
        prefixClass: 'text-amber-500',
        posture: 'animate-bounce-kawaii',
        emoji: '👾'
      }
    };

    this.bindEvents();
    this.startIdleQuipRotation();
  }

  setPersonality(personality, roastLevel = 3) {
    this.personality = personality.toLowerCase();
    this.roastLevel = Math.max(1, Math.min(5, roastLevel));
    
    if (this.personality === 'roast') {
      this.setEmotion('roast', `Roast Master Mode Level ${this.roastLevel} armed! Watch your sliders... 🔥`);
    } else if (this.personality === 'chaos') {
      this.setEmotion('chaos', `Chaos Mode Engaged! Let's shatter reality! ⚡👾`);
    } else if (this.personality === 'mentor') {
      this.setEmotion('thinking', `Senior Mentor Mode active. Ready to evaluate your composition.`);
    } else {
      this.setEmotion('happy', `Friendly Mode ready! Let's make something cute! ✨`);
    }
  }

  setEmotion(emotionKey, speechText = null, duration = 4000) {
    this.currentEmotion = emotionKey;
    const config = this.FridiiEmotions[emotionKey] || this.FridiiEmotions.idle;
    
    const container = document.getElementById('mascot-container');
    const svg = document.getElementById('mascot-svg');
    const mouth = document.getElementById('mouth-path');
    const prefix = document.getElementById('bot-emotion-prefix');
    const hand = document.getElementById('hand-group');
    const emojiContainer = document.getElementById('mascot-emoji-container');
    const speechEl = document.getElementById('bot-speech');

    if (mouth) mouth.setAttribute('d', config.mouth);

    if (container) {
      container.className = `w-32 h-44 relative animate-float group cursor-pointer drop-shadow-2xl ${config.posture}`;
    }

    if (svg) {
      const tail = svg.querySelector('.animate-tail');
      if (tail) tail.style.animationDuration = config.tail;

      const blushes = svg.querySelectorAll('.mascot-blush');
      blushes.forEach(b => {
        b.style.opacity = config.cheekOpacity;
        b.style.fill = config.cheekColor;
      });

      svg.classList.remove('active-sad', 'active-happy', 'active-roast', 'active-celebrate', 'active-thinking', 'active-chaos');
      if (emotionKey !== 'idle') svg.classList.add('active-' + emotionKey);
      svg.classList.toggle('active-sad', emotionKey === 'sad');

      const eyesGroup = document.getElementById('eyes-group');
      if (eyesGroup) {
        eyesGroup.className = config.eyeClass ? 'bot-eye' : '';
      }
    }

    if (hand) {
      hand.setAttribute('opacity', emotionKey === 'thinking' ? '1' : '0');
    }

    if (prefix) {
      prefix.innerText = config.prefix + ' ';
      prefix.className = `not-italic mr-1 font-bold ${config.prefixClass}`;
    }

    if (speechText && speechEl) {
      speechEl.innerText = speechText;
    }

    // Spawn floating emoji particle
    if (config.emoji && emojiContainer) {
      const el = document.createElement('div');
      el.className = 'mascot-emoji active';
      el.innerText = config.emoji;
      emojiContainer.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }

    // Play sound cue if gamification exists
    if (window.Gamification && window.Gamification.soundEnabled) {
      if (emotionKey === 'happy' || emotionKey === 'celebrate') window.Gamification.playSound('sparkle');
      if (emotionKey === 'sad') window.Gamification.playSound('flinch');
      if (emotionKey === 'roast') window.Gamification.playSound('click');
    }

    // Auto reset back to idle after duration
    clearTimeout(this.emotionResetTimer);
    if (emotionKey !== 'idle') {
      this.emotionResetTimer = setTimeout(() => {
        this.setEmotion('idle');
      }, duration);
    }
  }

  speak(text, duration = 3500) {
    const speechEl = document.getElementById('bot-speech');
    if (speechEl) {
      speechEl.innerText = text;
    }
  }

  botJoke() {
    const joke = this.JOKES[Math.floor(Math.random() * this.JOKES.length)];
    this.setEmotion('happy', `Haha! Here's one: ${joke} 😄`);
    this.triggerToast('+5 XP: MASCOT INTERACTION');
    if (window.Gamification) window.Gamification.addXP(5, 'Chatted with Fridii');
  }

  botRoast(level = this.roastLevel) {
    const phrase = this.ROAST_PHRASES[Math.floor(Math.random() * this.ROAST_PHRASES.length)];
    this.setEmotion('roast', phrase);
  }

  botSad() {
    const phrase = this.SAD_PHRASES[Math.floor(Math.random() * this.SAD_PHRASES.length)];
    this.setEmotion('sad', phrase);
  }

  botCelebrate() {
    const phrase = this.CELEBRATE_PHRASES[Math.floor(Math.random() * this.CELEBRATE_PHRASES.length)];
    this.setEmotion('celebrate', phrase, 5000);
    if (window.Gamification) {
      window.Gamification.launchConfetti();
      window.Gamification.playSound('badge');
    }
  }

  botThink() {
    const phrase = this.THINK_PHRASES[Math.floor(Math.random() * this.THINK_PHRASES.length)];
    this.setEmotion('thinking', phrase);
  }

  botSmile() {
    const phrase = this.HAPPY_PHRASES[Math.floor(Math.random() * this.HAPPY_PHRASES.length)];
    this.setEmotion('happy', phrase);
  }

  botReact(sliderType) {
    this.botSmile();
    this.triggerToast('+15 XP: CREATIVE ADJUSTMENT');
    if (window.Gamification) window.Gamification.addXP(15, `Adjusted ${sliderType}`);
  }

  triggerToast(text = '+15 XP: CREATIVE ADJUSTMENT') {
    const toast = document.getElementById('xp-toast');
    if (!toast) return;
    const label = toast.querySelector('span');
    if (label) label.innerText = text;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100', '-translate-y-2');
    setTimeout(() => {
      toast.classList.remove('opacity-100', '-translate-y-2');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2000);
  }

  flinch(reason = '') {
    this.setEmotion('sad', reason || "Whoa! That slider is at maximum extreme! 🛑", 3000);
    if (window.Gamification) window.Gamification.playSound('flinch');
  }

  pointAt(targetSelector, message = '') {
    const targetEl = document.querySelector(targetSelector);
    if (targetEl) {
      targetEl.classList.add('pilot-target-highlight');
      setTimeout(() => targetEl.classList.remove('pilot-target-highlight'), 3000);
    }
    this.setEmotion('thinking', message || 'Check out this tool recommendation! 👉', 3500);
  }

  holdBadge(badge) {
    this.setEmotion('celebrate', `🏆 Achievement Unlocked: "${badge.title}"! ${badge.desc}`, 4500);
    this.triggerToast(`🏆 BADGE: ${badge.title}`);
  }

  startIdleQuipRotation() {
    setInterval(() => {
      if (this.currentEmotion === 'idle') {
        const randomIdle = [
          "Nyaa~ let's make this masterpiece purrfect! ✨",
          "Canvas looking ready for your creative genius! 🎨",
          "Tap me anytime for design jokes or advice! 😸",
          "Ready to assist with color harmonics and layout! 🚀"
        ];
        const speechEl = document.getElementById('bot-speech');
        if (speechEl) {
          speechEl.innerText = randomIdle[Math.floor(Math.random() * randomIdle.length)];
        }
      }
    }, 15000);
  }

  bindEvents() {
    window.addEventListener('pux:badge-unlocked', (e) => {
      if (e.detail) this.holdBadge(e.detail);
    });

    window.addEventListener('pux:level-up', (e) => {
      this.botCelebrate();
      this.speak(`⚡ LEVEL UP! You are now a ${e.detail.title}!`);
    });
  }
}

// Global functions matching direct HTML onclick calls
function botJoke() {
  if (window.Mascot) window.Mascot.botJoke();
}

function botRoast() {
  if (window.Mascot) window.Mascot.botRoast();
}

function botSad() {
  if (window.Mascot) window.Mascot.botSad();
}

function botCelebrate() {
  if (window.Mascot) window.Mascot.botCelebrate();
}

function botThink() {
  if (window.Mascot) window.Mascot.botThink();
}

function botReact(type) {
  if (window.Mascot) window.Mascot.botReact(type);
}

function setFridiiEmotion(emotionKey) {
  if (window.Mascot) window.Mascot.setEmotion(emotionKey);
}

window.PilotMascot = PilotMascot;
window.FridiiMascot = PilotMascot;
