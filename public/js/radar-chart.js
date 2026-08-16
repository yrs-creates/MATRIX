/**
 * PUX PILOT — Creative Fingerprint Radar Chart
 * Renders a dynamic 5-axis spider/radar chart on HTML5 Canvas representing the user's design style.
 * Dimensions: Color Harmony, Composition, Typography, Experimentation, Contrast.
 */

class CreativeFingerprintChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.axes = [
      { key: 'color', label: 'Color' },
      { key: 'composition', label: 'Comp' },
      { key: 'typography', label: 'Type' },
      { key: 'experimentation', label: 'Exp' },
      { key: 'contrast', label: 'Contrast' }
    ];

    // Current values & target values for smooth animation
    this.currentValues = {
      color: 50,
      composition: 50,
      typography: 40,
      experimentation: 30,
      contrast: 50
    };

    this.targetValues = { ...this.currentValues };
    this.isAnimating = false;

    this.resize();
    this.render();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 220) * dpr;
    this.canvas.height = (rect.height || 180) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 220;
    this.height = rect.height || 180;
  }

  update(newScores = {}) {
    for (const key of Object.keys(this.targetValues)) {
      if (typeof newScores[key] === 'number') {
        this.targetValues[key] = Math.max(10, Math.min(100, newScores[key]));
      }
    }
    if (!this.isAnimating) {
      this.animate();
    }
  }

  animate() {
    this.isAnimating = true;
    let hasDelta = false;

    for (const key of Object.keys(this.currentValues)) {
      const delta = this.targetValues[key] - this.currentValues[key];
      if (Math.abs(delta) > 0.4) {
        this.currentValues[key] += delta * 0.12;
        hasDelta = true;
      } else {
        this.currentValues[key] = this.targetValues[key];
      }
    }

    this.render();

    if (hasDelta) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isAnimating = false;
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const width = this.width || 220;
    const height = this.height || 180;
    const centerX = width / 2;
    const centerY = height / 2 + 6;
    const radius = Math.min(centerX, centerY) - 26;
    const totalAxes = this.axes.length;

    ctx.clearRect(0, 0, width, height);

    // Draw background concentric polygon rings
    const ringLevels = [0.25, 0.5, 0.75, 1.0];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (const level of ringLevels) {
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius * level;
        const y = centerY + Math.sin(angle) * radius * level;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axis lines and labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const endX = centerX + Math.cos(angle) * radius;
      const endY = centerY + Math.sin(angle) * radius;

      // Axis line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Axis label
      const labelX = centerX + Math.cos(angle) * (radius + 16);
      const labelY = centerY + Math.sin(angle) * (radius + 16);
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(this.axes[i].label, labelX, labelY);
    }

    // Draw user fingerprint filled polygon
    ctx.beginPath();
    const points = [];

    for (let i = 0; i < totalAxes; i++) {
      const axis = this.axes[i];
      const val = (this.currentValues[axis.key] || 50) / 100;
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * (radius * val);
      const y = centerY + Math.sin(angle) * (radius * val);
      points.push({ x, y });

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Translucent Glowing Gradient Fill
    const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.55)');
    grad.addColorStop(0.7, 'rgba(34, 211, 238, 0.35)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0.1)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Polygon Outline Stroke with Glow
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#22d3ee';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw vertex dots
    for (const pt of points) {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Generates a witty co-pilot commentary on the current fingerprint shape
   */
  getMascotObservation() {
    const v = this.currentValues;
    if (v.color > 75 && v.typography < 40) {
      return "You're ultra strong on color vibrancy, but kind of dodging typography so far 👀";
    }
    if (v.contrast > 75 && v.color > 70) {
      return "High contrast + high color! You like punchy, bold visual impact! 💥";
    }
    if (v.experimentation > 70) {
      return "Look at that experimentation score — true avant-garde fearless energy! 🚀";
    }
    if (v.typography > 70 && v.composition > 70) {
      return "Layout & typography are looking super disciplined. Editorial director vibes! 📐";
    }
    return "Fingerprint is evolving with every tool you use! Keep creating.";
  }
}

window.CreativeFingerprintChart = CreativeFingerprintChart;
