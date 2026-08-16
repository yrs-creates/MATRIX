/**
 * PUX PILOT — "Add People" Portrait Compositing & Auto-Harmonization Engine
 * 100% Client-Side Person Segmentation, Mandatory Consent Guardrail,
 * Ambient Color Temperature Matching & Directional Soft Contact Shadows.
 */

class PersonCompositor {
  constructor() {
    this.currentPersonImage = null;
    this.currentCutoutDataUrl = null;
    this.hasConsent = false;
    this.autoHarmonizeEnabled = true;
    this.shadowIntensity = 60; // 0 to 100
  }

  /**
   * Enforces privacy and consent guardrail
   */
  setConsent(allowed) {
    this.hasConsent = !!allowed;
  }

  /**
   * Client-side background removal & subject segmentation (runs 100% locally in browser)
   */
  async isolatePerson(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.naturalWidth || 600;
        let h = img.naturalHeight || 800;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample 4 corner regions to determine background color palette
        const sampleCorner = (startX, startY) => {
          let r = 0, g = 0, b = 0, count = 0;
          for (let y = startY; y < startY + 20 && y < h; y++) {
            for (let x = startX; x < startX + 20 && x < w; x++) {
              const idx = (y * w + x) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }
          return { r: r / count, g: g / count, b: b / count };
        };

        const corners = [
          sampleCorner(0, 0),
          sampleCorner(w - 20, 0),
          sampleCorner(0, h - 20),
          sampleCorner(w - 20, h - 20)
        ];

        // Segmentation pass: calculate distance from background colors + center bias
        const centerX = w / 2;
        const centerY = h / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Distance to closest corner background sample
            let minBgDist = 999;
            for (const c of corners) {
              const d = Math.sqrt(Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2));
              if (d < minBgDist) minBgDist = d;
            }

            // Distance to image center (subjects are predominantly centered)
            const distCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const centerWeight = Math.max(0, 1 - (distCenter / (maxDist * 0.85)));

            // Edge threshold with soft alpha ramp
            const threshold = 38 + (1 - centerWeight) * 25;

            if (minBgDist < threshold) {
              // Background pixel -> make transparent
              data[idx + 3] = 0;
            } else if (minBgDist < threshold + 18) {
              // Edge feathering
              const alphaRatio = (minBgDist - threshold) / 18;
              data[idx + 3] = Math.round(data[idx + 3] * alphaRatio);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        this.currentCutoutDataUrl = canvas.toDataURL('image/png');
        resolve(this.currentCutoutDataUrl);
      };
      img.onerror = reject;
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
    });
  }

  /**
   * Auto-Harmonization Pass:
   * Measures base scene lighting and estimates light direction vector
   */
  analyzeBaseSceneHarmonization(baseCanvas) {
    if (!baseCanvas) return { tempShift: 0, brightnessShift: 0, lightAngleDeg: 45, shadowOffset: { x: 10, y: 18 } };

    const ctx = baseCanvas.getContext('2d');
    const w = Math.min(200, baseCanvas.width);
    const h = Math.min(200, baseCanvas.height);
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(baseCanvas, 0, 0, w, h);

    const imgData = offCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let leftLum = 0, rightLum = 0, topLum = 0, bottomLum = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    const count = w * h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        totalR += r; totalG += g; totalB += b;
        if (x < w / 2) leftLum += lum; else rightLum += lum;
        if (y < h / 2) topLum += lum; else bottomLum += lum;
      }
    }

    const avgR = totalR / count;
    const avgB = totalB / count;
    const warmth = ((avgR - avgB) / 255) * 60; // -30 to +30

    // Light direction estimation from quadrant luminance
    const dx = rightLum - leftLum;
    const dy = bottomLum - topLum;
    const lightAngle = Math.atan2(dy, dx);
    const lightAngleDeg = Math.round((lightAngle * 180) / Math.PI);

    // Cast shadow in opposite direction of strongest light
    const shadowX = Math.round(-Math.cos(lightAngle) * 16);
    const shadowY = Math.max(12, Math.round(-Math.sin(lightAngle) * 22));

    return {
      tempShift: Math.round(warmth),
      brightnessShift: Math.round(((topLum + bottomLum) / count - 128) / 6),
      lightAngleDeg,
      shadowOffset: { x: shadowX, y: shadowY }
    };
  }

  /**
   * Adds the harmonized person cutout to the CanvasEngine as a new layer
   */
  async addPersonToCanvas(canvasEngine, name = 'Person') {
    if (!this.hasConsent) {
      alert('Consent Required: Please confirm you have permission to use this person\'s photo.');
      return false;
    }

    if (!this.currentCutoutDataUrl) {
      alert('Please upload a person photo first.');
      return false;
    }

    // Harmonization data from base scene
    const harm = this.autoHarmonizeEnabled
      ? this.analyzeBaseSceneHarmonization(canvasEngine.canvas)
      : { tempShift: 0, brightnessShift: 0, shadowOffset: { x: 8, y: 16 } };

    const cutoutImg = new Image();
    cutoutImg.src = this.currentCutoutDataUrl;
    await new Promise(r => { cutoutImg.onload = r; });

    // Calculate natural proportion scale (approx 40-55% of canvas height)
    const aspect = cutoutImg.naturalWidth / cutoutImg.naturalHeight;
    const targetH = 0.55; // 55% of canvas height
    const targetW = targetH * aspect * (canvasEngine.height / canvasEngine.width);

    const layer = {
      type: 'person',
      name: `Person: ${name}`,
      image: cutoutImg,
      x: 0.5,
      y: 0.65,
      w: targetW,
      h: targetH,
      rotation: 0,
      opacity: 1,
      harmonize: {
        enabled: this.autoHarmonizeEnabled,
        temperature: harm.tempShift,
        brightness: harm.brightnessShift
      },
      shadow: {
        enabled: this.shadowIntensity > 0,
        blur: Math.round(18 * (this.shadowIntensity / 100)),
        color: 'rgba(0, 0, 0, 0.65)',
        offsetX: harm.shadowOffset.x,
        offsetY: harm.shadowOffset.y
      }
    };

    canvasEngine.addLayer(layer);

    // Mascot reaction & Gamification
    if (window.Mascot) {
      window.Mascot.speak("Person composited with auto-harmonized lighting and contact shadow! 👤✨", 3500);
      window.Mascot.pointAt('#tool-tab-layers');
    }

    if (window.Gamification) {
      window.Gamification.addXP(40, 'Composited Person into Scene');
    }

    return true;
  }
}

window.PersonCompositor = PersonCompositor;
