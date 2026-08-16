# 🚁 PUX PILOT — AI Co-Pilot Photo Editor

> **"Your creative co-pilot."** — A non-destructive HTML5 canvas photo editor paired with a real-time design intelligence engine, dynamic knowledge injection, and gamified creative growth.

---

## 🌟 Key Highlights

- **🧠 "Trained" Design Brain**: Unified `design-knowledge.json` holding machine-checkable `trigger` conditions and rich explanations across Color Theory, Composition, Typography, Contrast, and Lighting.
- **⚡ Dynamic Knowledge Injection**: Analyzes the canvas state and injects *only* relevant knowledge slices and personality few-shot examples into system prompts.
- **🛡️ Multi-Provider Fallback Cascade**: Groq (Llama 3.3 70B) ➔ OpenRouter ➔ Google Gemini Flash ➔ Local Rule Engine. Always delivers instant responses even when offline or without API keys.
- **🤖 The Pilot Mascot**: Animated drone/cockpit avatar with 4 expression modes (Friendly, Mentor, Roast 1–5, Chaos), slider boundary flinches, tool pointer beams, and celebratory badge lifts.
- **🎯 3-Step "Vibe Check" Onboarding**: 2+2 skill check with celebratory/forgiving branches, personality energy selector, and visual theme customization.
- **📊 5-Axis Creative Fingerprint**: Dynamic radar/spider chart (Color, Comp, Type, Exp, Contrast) that evolves as you edit.
- **🏆 Gamified XP & Achievements**: 12 unlockable badges, leveling system, localized co-pilot confetti, and synthesized Web Audio sound cues.
- **🎨 Non-Destructive Canvas Engine**: Base image, text layers, shapes, sticker emojis, freehand brush/eraser, 11 adjustment sliders, 10 preset filters, aspect-ratio crop, rotate/flip, and 4K export.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Configure Free API Keys
Copy `.env.example` to `.env` and add your free keys if available:
```bash
cp .env.example .env
```
*(If no keys are provided, Pux Pilot runs seamlessly on its built-in offline rule engine!)*

### 3. Start the Server
```bash
npm start
```
Open your browser at **`http://localhost:3001`**.

---

## 🏗️ Architecture & Project Structure

```
MATRIX/
├── package.json                    # Node dependencies (express, cors, dotenv)
├── server.js                       # Express backend with knowledge injection & fallback cascade
├── .env.example                    # Sample environment variables for LLM keys
├── design-knowledge.json           # Unified design brain with triggers, issues & fixes
├── few-shot-examples.json          # Curated few-shot dialogue examples per personality
├── public/
│   ├── index.html                  # Full responsive 3-column UI (Tools | Canvas | Co-Pilot)
│   ├── css/
│   │   └── style.css               # Glassmorphic dark UI, CSS variables & animations
│   ├── js/
│   │   ├── app.js                  # Main controller, state management & UI shortcuts
│   │   ├── canvas-engine.js        # Multi-layer canvas engine, adjustments, filters, transforms
│   │   ├── mascot.js               # The Pilot avatar (4 expression modes, flinches, pointer)
│   │   ├── rules.js                # Instant offline rule evaluation engine & templating
│   │   ├── ai-client.js            # Network client with graceful offline fallback
│   │   ├── radar-chart.js          # 5-axis Creative Fingerprint canvas radar chart
│   │   ├── gamification.js         # XP progression, 12 badges, Web Audio synth sounds, confetti
│   │   └── sample-images.js        # Built-in high-res starter demo images
└── README.md                       # Documentation & guide
```

---

## 🎛️ AI Endpoints & Fallback Flow

| Endpoint | Method | Purpose | Fallback Behavior |
|---|---|---|---|
| `/api/ai/chat` | `POST` | Live co-pilot dialogue & easter eggs | Contextual rule-based reply |
| `/api/ai/analyze` | `POST` | 5-dimension scorecard + critique | Rule-calculated ratings & feedback |
| `/api/ai/make-it-better` | `POST` | Actionable parameter suggestions | Deterministic rule enhancements |
| `/api/ai/challenge` | `POST` | Generates creative constraint tasks | Procedural challenge pool |
| `/api/ai/check-challenge` | `POST` | Evaluates canvas against requirements | Local constraint checker |
| `/api/knowledge` | `GET` | Serves unified knowledge base | Embedded client knowledge |

---

## ⌨️ Keyboard Shortcuts

- **`Ctrl+Z` / `Cmd+Z`**: Undo
- **`Ctrl+Y` / `Cmd+Y`**: Redo
- **`Ctrl+S` / `Cmd+S`**: Open Export Modal
- **`Delete` / `Backspace`**: Delete Selected Layer
- **`C`**: Toggle Split View Comparison

---

## 📜 License
MIT License. Built for the modern creator.
