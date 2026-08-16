/**
 * PUX PILOT — "Match This Vibe" Style Look Matching Engine
 * Performs client-side quantitative pixel analysis (histogram, color temp, tint, contrast, vignette)
 * and applies editable adjustment recipes with a live 0-100% Match Intensity slider.
 */

class StyleMatcher {
  constructor() {
    this.currentReferenceImage = null;
    this.currentRecipe = null;
    this.baseRecipeDeltas = null;
    this.initialTargetAdjustments = null;
    this.matchIntensity = 100; // 0 to 100%

    this.presetVibes = [
      {
        id: 'vibe_cyberpunk',
        name: 'Cinematic Cyberpunk',
        tag: 'Neon Teal & Magenta',
        icon: '🌆',
        stats: { temperature: -35, tint: 25, contrast: 30, saturation: 35, vignette: 30, lightness: -5 }
      },
      {
        id: 'vibe_vintage_kodak',
        name: 'Vintage 70s Film',
        tag: 'Warm Amber & Matte Fade',
        icon: '🎞️',
        stats: { temperature: 35, tint: -10, contrast: 15, saturation: -15, vignette: 25, lightness: 8 }
      },
      {
        id: 'vibe_nordic_noir',
        name: 'Moody Nordic Noir',
        tag: 'Desaturated & Deep Shadow',
        icon: '🖤',
        stats: { temperature: -20, tint: 0, contrast: 40, saturation: -40, vignette: 40, lightness: -15 }
      },
      {
        id: 'vibe_golden_pastel',
        name: 'Golden Hour Pastel',
        tag: 'Sunlit Dream & Soft Glow',
        icon: '🌅',
        stats: { temperature: 28, tint: 12, contrast: -10, saturation: 18, vignette: 15, lightness: 12 }
      }
    ];
  }

  /**
   * Client-side quantitative pixel sampling (Zero external network dependencies)
   */
  extractStats(imgOrCanvas) {
    const sampleCanvas = document.createElement('canvas');
    const sz = 256;
    sampleCanvas.width = sz;
    sampleCanvas.height = sz;
    const ctx = sampleCanvas.getContext('2d');

    ctx.drawImage(imgOrCanvas, 0, 0, sz, sz);
    const imgData = ctx.getImageData(0, 0, sz, sz);
    const pixels = imgData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    let totalH = 0, totalS = 0, totalL = 0;
    let shadows = 0, midtones = 0, highlights = 0;
    const luminanceList = [];

    let centerL = 0, centerCount = 0;
    let cornerL = 0, cornerCount = 0;

    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const idx = (y * sz + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];

        totalR += r;
        totalG += g;
        totalB += b;

        // Relative luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminanceList.push(lum);

        // Histogram categories
        if (lum < 85) shadows++;
        else if (lum < 170) midtones++;
        else highlights++;

        // HSL
        const hsl = this.rgbToHsl(r, g, b);
        totalH += hsl[0];
        totalS += hsl[1];
        totalL += hsl[2];

        // Vignette detection: Central 40% vs Outer 20% corners
        const distFromCenter = Math.sqrt(Math.pow(x - 128, 2) + Math.pow(y - 128, 2));
        if (distFromCenter < 50) {
          centerL += lum;
          centerCount++;
        } else if (distFromCenter > 130) {
          cornerL += lum;
          cornerCount++;
        }
      }
    }

    const totalPixels = sz * sz;
    const avgR = totalR / totalPixels;
    const avgG = totalG / totalPixels;
    const avgB = totalB / totalPixels;
    const avgL = totalL / totalPixels * 100;
    const avgS = totalS / totalPixels * 100;

    // Color temperature bias (R - B difference)
    const warmthScore = ((avgR - avgB) / 255) * 100;

    // Tint bias (Green vs Magenta)
    const tintScore = (((avgG * 2) - (avgR + avgB)) / 255) * 100;

    // Contrast standard deviation
    let sumSqDiff = 0;
    const meanLum = (totalR + totalG + totalB) / (totalPixels * 3);
    for (let i = 0; i < luminanceList.length; i++) {
      sumSqDiff += Math.pow(luminanceList[i] - meanLum, 2);
    }
    const stdDevLum = Math.sqrt(sumSqDiff / totalPixels);
    const contrastScore = (stdDevLum / 128) * 100;

    // Vignette calculation
    const avgCenter = centerCount > 0 ? centerL / centerCount : 128;
    const avgCorner = cornerCount > 0 ? cornerL / cornerCount : 128;
    const vignetteScore = Math.max(0, Math.min(80, ((avgCenter - avgCorner) / 128) * 100));

    return {
      lightness: Math.round(avgL),
      saturation: Math.round(avgS),
      temperature: Math.round(warmthScore),
      tint: Math.round(tintScore),
      contrast: Math.round(contrastScore),
      vignette: Math.round(vignetteScore),
      shadowRatio: shadows / totalPixels,
      midRatio: midtones / totalPixels,
      highlightRatio: highlights / totalPixels
    };
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s, l];
  }

  /**
   * Matches style between target canvas and reference image
   */
  async matchStyle(referenceImageSrc, targetCanvasEngine) {
    if (!targetCanvasEngine.hasImage) return null;

    // Extract target stats
    const targetStats = this.extractStats(targetCanvasEngine.canvas);

    let refStats = null;
    let refImgElement = null;

    if (typeof referenceImageSrc === 'string') {
      refImgElement = await this.loadImageElement(referenceImageSrc);
      refStats = this.extractStats(refImgElement);
      this.currentReferenceImage = referenceImageSrc;
    } else if (referenceImageSrc && referenceImageSrc.stats) {
      refStats = referenceImageSrc.stats;
      this.currentReferenceImage = null;
    }

    // Call API (with automatic local quantitative fallback)
    const result = await window.AI.matchStyle(
      targetCanvasEngine.canvas.toDataURL('image/jpeg', 0.8),
      this.currentReferenceImage,
      { target: targetStats, reference: refStats }
    );

    this.currentRecipe = result.recipe;
    this.baseRecipeDeltas = { ...result.recipe };
    this.initialTargetAdjustments = { ...targetCanvasEngine.adjustments };
    this.matchIntensity = 100;

    // Apply recipe
    this.applyIntensity(100, targetCanvasEngine);

    // Provide feedback & Co-Pilot speech
    if (window.Mascot) {
      window.Mascot.speak(`Vibe matched! ${result.explanation.substring(0, 65)}...`, 4000);
      window.Mascot.pointAt('#slider-temperature');
    }

    if (window.Gamification) {
      window.Gamification.addXP(35, 'Matched Style Vibe');
    }

    return result;
  }

  /**
   * Applies recipe scaled by match intensity (0% to 100%)
   */
  applyIntensity(intensityPct, targetCanvasEngine) {
    this.matchIntensity = Math.max(0, Math.min(100, intensityPct));
    if (!this.baseRecipeDeltas || !this.initialTargetAdjustments) return;

    const factor = this.matchIntensity / 100;

    for (const [key, delta] of Object.entries(this.baseRecipeDeltas)) {
      const initial = this.initialTargetAdjustments[key] || 0;
      const targetVal = Math.round(initial + delta * factor);
      targetCanvasEngine.setAdjustment(key, targetVal);

      // Sync DOM slider if present
      const slider = document.getElementById(`slider-${key}`);
      const valDisplay = document.getElementById(`val-${key}`);
      if (slider) slider.value = targetVal;
      if (valDisplay) valDisplay.textContent = targetVal;
    }
  }

  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}

window.StyleMatcher = StyleMatcher;
