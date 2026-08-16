/**
 * PUX PILOT — Procedural Sample Images
 * Generates high-quality SVG/Canvas test images for instant testing without external network dependencies.
 */

const SampleImages = {
  /**
   * 1. Cyberpunk Neon Street
   */
  getCyberpunkStreet() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
    bgGrad.addColorStop(0, '#0a051b');
    bgGrad.addColorStop(0.5, '#190a36');
    bgGrad.addColorStop(0.8, '#2d0f4d');
    bgGrad.addColorStop(1, '#05030a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    // Neon Grid Perspective Floor
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 2;
    for (let x = -600; x <= 1800; x += 120) {
      ctx.beginPath();
      ctx.moveTo(600, 480);
      ctx.lineTo(x, 800);
      ctx.stroke();
    }
    for (let y = 490; y <= 800; y += (y - 460) * 0.35 + 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }
    ctx.restore();

    // Distant City Skyline Silhouettes
    ctx.fillStyle = '#0f0724';
    const buildings = [
      { x: 40, w: 90, h: 280 },
      { x: 140, w: 120, h: 360 },
      { x: 280, w: 80, h: 240 },
      { x: 380, w: 140, h: 420 },
      { x: 540, w: 100, h: 310 },
      { x: 660, w: 150, h: 450 },
      { x: 830, w: 110, h: 340 },
      { x: 960, w: 130, h: 390 },
      { x: 1100, w: 80, h: 260 }
    ];
    buildings.forEach(b => {
      ctx.fillRect(b.x, 480 - b.h, b.w, b.h);
      // Windows
      ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      for (let r = 0; r < b.h - 40; r += 28) {
        for (let c = 12; c < b.w - 12; c += 18) {
          if (Math.random() > 0.4) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(34, 211, 238, 0.8)' : 'rgba(244, 63, 94, 0.8)';
            ctx.fillRect(b.x + c, 480 - b.h + r + 20, 8, 12);
          }
        }
      }
      ctx.fillStyle = '#0f0724';
    });

    // Giant Glowing Synthwave Sun
    const sunGrad = ctx.createRadialGradient(600, 380, 20, 600, 380, 160);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.4, '#f43f5e');
    sunGrad.addColorStop(0.8, '#8b5cf6');
    sunGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(600, 380, 160, 0, Math.PI * 2);
    ctx.fill();

    // Sun horizontal scanline cuts
    ctx.fillStyle = '#0a051b';
    for (let sy = 340; sy <= 460; sy += 14) {
      ctx.fillRect(440, sy, 320, (sy - 330) * 0.15 + 2);
    }

    // Neon Billboard Signs
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('NEO MATRIX', 150, 200);

    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('PUX PILOT // 2026', 720, 160);
    ctx.shadowBlur = 0;

    return canvas.toDataURL('image/png');
  },

  /**
   * 2. Golden Hour Mountain Landscape
   */
  getGoldenHourLandscape() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.3, '#312e81');
    sky.addColorStop(0.6, '#ea580c');
    sky.addColorStop(0.85, '#f59e0b');
    sky.addColorStop(1, '#fef08a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1200, 800);

    // Glowing Morning Sun
    const sunGrad = ctx.createRadialGradient(850, 420, 10, 850, 420, 200);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.2, '#fef08a');
    sunGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.4)');
    sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(850, 420, 200, 0, Math.PI * 2);
    ctx.fill();

    // Mountain Layer 1 (Far back, warm haze)
    ctx.fillStyle = 'rgba(120, 53, 15, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.lineTo(200, 360);
    ctx.lineTo(420, 460);
    ctx.lineTo(650, 320);
    ctx.lineTo(900, 480);
    ctx.lineTo(1200, 380);
    ctx.lineTo(1200, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    ctx.fill();

    // Mountain Layer 2 (Midground, deep purple/crimson)
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(0, 580);
    ctx.lineTo(160, 440);
    ctx.lineTo(380, 540);
    ctx.lineTo(620, 410);
    ctx.lineTo(840, 560);
    ctx.lineTo(1080, 430);
    ctx.lineTo(1200, 510);
    ctx.lineTo(1200, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    ctx.fill();

    // Lake Reflection & Foreground Pines
    const lake = ctx.createLinearGradient(0, 600, 0, 800);
    lake.addColorStop(0, '#1e1b4b');
    lake.addColorStop(0.5, '#431407');
    lake.addColorStop(1, '#09090b');
    ctx.fillStyle = lake;
    ctx.fillRect(0, 600, 1200, 200);

    // Pine Trees Foreground Silhouette
    ctx.fillStyle = '#09090b';
    for (let x = -20; x < 1220; x += 35) {
      const treeH = 120 + Math.sin(x) * 40 + Math.random() * 30;
      ctx.beginPath();
      ctx.moveTo(x, 800);
      ctx.lineTo(x + 20, 800 - treeH);
      ctx.lineTo(x + 40, 800);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  },

  /**
   * 3. Studio Portrait Silhouette & Geometric Lighting
   */
  getStudioPortrait() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // Dark Studio Background
    const bg = ctx.createRadialGradient(400, 500, 50, 400, 500, 600);
    bg.addColorStop(0, '#27272a');
    bg.addColorStop(0.6, '#18181b');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 800, 1000);

    // Rim Lighting Glows (Cyan left, Magenta right)
    const cyanRim = ctx.createRadialGradient(200, 450, 10, 200, 450, 300);
    cyanRim.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
    cyanRim.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = cyanRim;
    ctx.fillRect(0, 0, 800, 1000);

    const magRim = ctx.createRadialGradient(600, 450, 10, 600, 450, 300);
    magRim.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
    magRim.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = magRim;
    ctx.fillRect(0, 0, 800, 1000);

    // Silhouette Figure (Head & Shoulders)
    ctx.fillStyle = '#111114';
    ctx.beginPath();
    // Head
    ctx.ellipse(400, 380, 120, 160, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck & Shoulders
    ctx.beginPath();
    ctx.moveTo(330, 520);
    ctx.lineTo(330, 600);
    ctx.quadraticCurveTo(240, 650, 80, 750);
    ctx.lineTo(80, 1000);
    ctx.lineTo(720, 1000);
    ctx.lineTo(720, 750);
    ctx.quadraticCurveTo(560, 650, 470, 600);
    ctx.lineTo(470, 520);
    ctx.closePath();
    ctx.fill();

    // Subtle Rim Light strokes
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(400, 380, 120, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();

    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(400, 380, 120, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  },

  /**
   * 4. Modern Minimalist Product Flatlay
   */
  getMinimalistFlatlay() {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // Clean neutral sand backdrop
    ctx.fillStyle = '#e4e4e7';
    ctx.fillRect(0, 0, 1000, 1000);

    // Soft architectural shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(600, 0);
    ctx.lineTo(1000, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    ctx.fill();

    // Geometric Podiums & Objects
    // Podium 1 (Circle)
    ctx.fillStyle = '#f4f4f5';
    ctx.beginPath();
    ctx.arc(420, 480, 180, 0, Math.PI * 2);
    ctx.fill();

    // Glass Cube Outline
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 320, 200, 200);

    // Ceramic Vase Object
    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.ellipse(420, 460, 60, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    // Botanical Leaf Shadow
    ctx.fillStyle = 'rgba(39, 39, 42, 0.15)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(300 + i * 40, 200 + i * 30, 30, 80, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  }
};

window.SampleImages = SampleImages;
