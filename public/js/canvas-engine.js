/**
 * PUX PILOT — Non-Destructive Multi-Layer Canvas Engine
 * Supports Base Image, Text, Shapes, Stickers, Brush/Eraser, Live Adjustments,
 * 10 Preset Filters, Aspect-Ratio Crop, Rotate/Flip, Undo/Redo, and High-Res Export.
 */

class CanvasEngine {
  constructor(canvasId = 'main-canvas', viewportContainerId = 'canvas-viewport') {
    this.canvas = document.getElementById(canvasId);
    this.viewport = document.getElementById(viewportContainerId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Base Dimensions
    this.width = 1200;
    this.height = 800;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Base Image
    this.baseImage = null;
    this.baseImageOriginal = null;
    this.hasImage = false;

    // Non-destructive Layers
    this.layers = [];
    this.selectedLayerId = null;

    // Adjustments
    this.adjustments = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      tint: 0,
      vignette: 0,
      sharpness: 0,
      blur: 0,
      highlights: 0,
      shadows: 0
    };

    // Transformations
    this.rotation = 0; // degrees
    this.flipH = false;
    this.flipV = false;
    this.filter = 'none';

    // Active Tool Mode: 'select' | 'crop' | 'brush' | 'eraser' | 'shape' | 'text'
    this.activeTool = 'select';

    // Crop State
    this.isCropping = false;
    this.cropRect = { x: 0, y: 0, w: 1, h: 1 }; // normalized 0..1
    this.cropAspectRatio = null; // null | 1 | 4/5 | 16/9 | 9/16

    // Brush State
    this.brush = {
      color: '#22d3ee',
      size: 12,
      opacity: 0.9,
      isDrawing: false,
      currentStroke: null
    };

    // History Stack for Undo/Redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 25;

    // Before/After Split Comparison
    this.isComparing = false;
    this.compareSplit = 0.5; // 0..1

    // Viewport Zoom & Pan
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };

    this.bindEvents();
    this.saveHistory('Initial State');
  }

  /* ==========================================================================
     IMAGE LOADING & IMPORT
     ========================================================================== */

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.baseImage = img;
        this.baseImageOriginal = img;
        this.hasImage = true;
        this.width = img.naturalWidth || 1200;
        this.height = img.naturalHeight || 800;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.cropRect = { x: 0, y: 0, w: 1, h: 1 };

        // Hide empty canvas state
        const emptyState = document.getElementById('canvas-empty-state');
        if (emptyState) emptyState.style.display = 'none';

        this.fitToViewport();
        this.render();
        this.saveHistory('Load Image');

        // Gamification unlock
        if (window.Gamification) {
          window.Gamification.unlockAchievement('first_flight');
          window.Gamification.addXP(25, 'Loaded Image');
        }

        // Trigger Rule Evaluation
        this.notifyStateChanged();
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  fitToViewport() {
    if (!this.viewport || !this.canvas) return;
    const vpRect = this.viewport.getBoundingClientRect();
    const padding = 40;
    const availW = Math.max(300, vpRect.width - padding * 2);
    const availH = Math.max(300, vpRect.height - padding * 2);

    const scaleW = availW / this.width;
    const scaleH = availH / this.height;
    this.zoom = Math.min(1, Math.min(scaleW, scaleH));
    this.panX = 0;
    this.panY = 0;
    this.applyViewportTransform();
  }

  applyViewportTransform() {
    if (!this.canvas) return;
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    const zoomDisplay = document.getElementById('zoom-level-text');
    if (zoomDisplay) zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  setZoom(delta, centerX, centerY) {
    const prevZoom = this.zoom;
    this.zoom = Math.max(0.15, Math.min(4, this.zoom + delta));
    this.applyViewportTransform();
  }

  /* ==========================================================================
     LAYER MANAGEMENT
     ========================================================================== */

  addLayer(layer) {
    layer.id = 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    layer.visible = layer.visible !== false;
    layer.locked = !!layer.locked;
    layer.opacity = layer.opacity !== undefined ? layer.opacity : 1;
    this.layers.push(layer);
    this.selectedLayerId = layer.id;
    this.render();
    this.saveHistory(`Add ${layer.type} Layer`);
    this.updateLayersUI();

    if (layer.type === 'text' && window.Gamification) {
      window.Gamification.unlockAchievement('type_titan');
    }
    if (this.layers.length >= 3 && window.Gamification) {
      window.Gamification.unlockAchievement('layer_architect');
    }

    this.notifyStateChanged();
    return layer;
  }

  removeLayer(layerId) {
    this.layers = this.layers.filter(l => l.id !== layerId);
    if (this.selectedLayerId === layerId) this.selectedLayerId = null;
    this.render();
    this.saveHistory('Delete Layer');
    this.updateLayersUI();
    this.notifyStateChanged();
  }

  moveLayer(layerId, direction) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return;
    if (direction === 'up' && idx < this.layers.length - 1) {
      const temp = this.layers[idx];
      this.layers[idx] = this.layers[idx + 1];
      this.layers[idx + 1] = temp;
    } else if (direction === 'down' && idx > 0) {
      const temp = this.layers[idx];
      this.layers[idx] = this.layers[idx - 1];
      this.layers[idx - 1] = temp;
    }
    this.render();
    this.updateLayersUI();
    this.notifyStateChanged();
  }

  getSelectedLayer() {
    return this.layers.find(l => l.id === this.selectedLayerId);
  }

  updateLayersUI() {
    if (typeof updateLayersList === 'function') {
      updateLayersList();
      return;
    }
    const list = document.getElementById('layers-list') || document.getElementById('layers-list-container');
    if (!list) return;

    if (this.layers.length === 0) {
      list.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">No extra layers added yet. Use Text, Shapes, Stickers, or Brush tools.</div>`;
      return;
    }

    list.innerHTML = this.layers.slice().reverse().map(l => `
      <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 group hover:border-blue-300 ${l.id === this.selectedLayerId ? 'border-blue-500 bg-blue-50/50' : ''}" data-id="${l.id}">
        <div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 text-xs font-bold">${this.getLayerIcon(l.type)}</div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-slate-800 truncate">${l.name || (l.type.toUpperCase() + ' Layer')}</div>
          <div class="text-[10px] text-slate-400">Layer</div>
        </div>
        <button class="text-slate-400 hover:text-slate-600" title="Toggle Visibility" onclick="event.stopPropagation(); window.CanvasEngine.toggleLayerVisibility('${l.id}')">${l.visible ? '👁️' : '🚫'}</button>
        <button class="text-slate-400 hover:text-red-500" title="Delete Layer" onclick="event.stopPropagation(); window.CanvasEngine.removeLayer('${l.id}')">🗑️</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-id]').forEach(el => {
      el.onclick = () => {
        this.selectedLayerId = el.getAttribute('data-id');
        this.updateLayersUI();
        this.render();
      };
    });
  }

  toggleLayerVisibility(layerId) {
    const l = this.layers.find(x => x.id === layerId);
    if (l) {
      l.visible = !l.visible;
      this.render();
      this.updateLayersUI();
    }
  }

  getLayerIcon(type) {
    if (type === 'text') return '✍️';
    if (type === 'shape') return '🔷';
    if (type === 'sticker') return '⭐';
    if (type === 'brush') return '🖌️';
    if (type === 'person') return '👤';
    return '📄';
  }

  /* ==========================================================================
     RENDERING PIPELINE (Adjustments, Filters, Layers, Vignette)
     ========================================================================== */

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!this.hasImage && !this.baseImage) {
      return;
    }

    ctx.save();

    // 1. Rotation and Flip Transform
    ctx.translate(w / 2, h / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    ctx.translate(-w / 2, -h / 2);

    // 2. Build CSS Filter String for Hardware Acceleration
    const adj = this.adjustments;
    const briPct = 100 + adj.brightness;
    const conPct = 100 + adj.contrast;
    const satPct = 100 + adj.saturation;
    const blurPx = Math.max(0, adj.blur * 0.3);

    // Preset Filter Modifiers
    let filterString = `brightness(${briPct}%) contrast(${conPct}%) saturate(${satPct}%) blur(${blurPx}px)`;
    filterString += this.getPresetFilterCSS();

    ctx.filter = filterString;

    // Draw Base Image
    if (this.baseImage) {
      ctx.drawImage(this.baseImage, 0, 0, w, h);
    }
    ctx.filter = 'none';

    // 3. Temperature & Tint Overlay
    if (adj.temperature !== 0 || adj.tint !== 0) {
      this.renderColorBalance(ctx, w, h, adj.temperature, adj.tint);
    }

    // 4. Exposure & Highlights/Shadows Simulation
    if (adj.exposure !== 0) {
      ctx.fillStyle = adj.exposure > 0 ? `rgba(255, 255, 255, ${adj.exposure / 180})` : `rgba(0, 0, 0, ${Math.abs(adj.exposure) / 150})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 5. Draw Non-Destructive Layers
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
      this.renderLayer(ctx, layer, w, h);
      ctx.restore();
    }

    // 6. Vignette Radial Overlay
    if (adj.vignette > 0) {
      this.renderVignette(ctx, w, h, adj.vignette);
    }

    ctx.restore();

    // 7. Crop Overlay if active
    if (this.isCropping) {
      this.renderCropOverlay(ctx, w, h);
    }

    // 8. Before/After Split Line if comparing
    if (this.isComparing && this.baseImageOriginal) {
      this.renderCompareSplit(ctx, w, h);
    }
  }

  renderColorBalance(ctx, w, h, temp, tint) {
    ctx.save();
    if (temp > 0) {
      // Warm amber
      ctx.fillStyle = `rgba(245, 158, 11, ${temp / 260})`;
      ctx.fillRect(0, 0, w, h);
    } else if (temp < 0) {
      // Cool cyan
      ctx.fillStyle = `rgba(34, 211, 238, ${Math.abs(temp) / 260})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (tint > 0) {
      // Magenta
      ctx.fillStyle = `rgba(244, 63, 94, ${tint / 280})`;
      ctx.fillRect(0, 0, w, h);
    } else if (tint < 0) {
      // Green
      ctx.fillStyle = `rgba(16, 185, 129, ${Math.abs(tint) / 280})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  renderVignette(ctx, w, h, amount) {
    ctx.save();
    const radius = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));
    const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.4, w / 2, h / 2, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${amount / 100 * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  getPresetFilterCSS() {
    switch (this.filter) {
      case 'cyberpunk':
        return ' hue-rotate(185deg) contrast(125%) saturate(140%)';
      case 'vintage35':
        return ' sepia(35%) contrast(90%) brightness(105%) saturate(85%)';
      case 'noir':
        return ' grayscale(100%) contrast(150%) brightness(90%)';
      case 'golden':
        return ' sepia(25%) saturate(130%) brightness(108%)';
      case 'pastel':
        return ' brightness(115%) saturate(75%) contrast(95%)';
      case 'bw_contrast':
        return ' grayscale(100%) contrast(180%)';
      case 'matrix':
        return ' hue-rotate(85deg) saturate(160%) contrast(130%)';
      case 'vaporwave':
        return ' hue-rotate(270deg) saturate(150%) brightness(105%)';
      case 'hdr':
        return ' contrast(135%) saturate(130%) brightness(105%)';
      case 'studio':
        return ' contrast(110%) brightness(102%) saturate(105%)';
      default:
        return '';
    }
  }

  renderLayer(ctx, layer, w, h) {
    if (layer.type === 'text') {
      const x = layer.x * w;
      const y = layer.y * h;
      ctx.font = `${layer.weight || 'bold'} ${layer.size || 48}px "${layer.font || 'Outfit'}", sans-serif`;
      ctx.textAlign = layer.align || 'center';
      ctx.textBaseline = 'middle';

      if (layer.shadowBlur) {
        ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
      }

      if (layer.strokeWidth && layer.strokeColor) {
        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = layer.strokeWidth;
        ctx.strokeText(layer.text, x, y);
      }

      ctx.fillStyle = layer.color || '#ffffff';
      ctx.fillText(layer.text, x, y);
      ctx.shadowBlur = 0;
    } else if (layer.type === 'sticker') {
      const x = layer.x * w;
      const y = layer.y * h;
      const size = (layer.size || 80);
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(layer.content || '⭐', x, y);
    } else if (layer.type === 'shape') {
      const x = layer.x * w;
      const y = layer.y * h;
      const width = (layer.w || 0.2) * w;
      const height = (layer.h || 0.15) * h;

      ctx.fillStyle = layer.fillColor || 'rgba(139, 92, 246, 0.4)';
      ctx.strokeStyle = layer.strokeColor || '#8b5cf6';
      ctx.lineWidth = layer.strokeWidth || 3;

      if (layer.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        if (layer.fillColor) ctx.fill();
        ctx.stroke();
      } else if (layer.shape === 'arrow') {
        this.drawArrow(ctx, x, y, x + width, y + height, layer.strokeColor || '#22d3ee', layer.strokeWidth || 4);
      } else {
        // Rectangle
        if (layer.fillColor) ctx.fillRect(x - width / 2, y - height / 2, width, height);
        ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      }
    } else if (layer.type === 'brush') {
      if (!layer.points || layer.points.length < 2) return;
      ctx.strokeStyle = layer.color || '#22d3ee';
      ctx.lineWidth = layer.size || 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(layer.points[0].x * w, layer.points[0].y * h);
      for (let i = 1; i < layer.points.length; i++) {
        ctx.lineTo(layer.points[i].x * w, layer.points[i].y * h);
      }
      ctx.stroke();
    } else if (layer.type === 'person') {
      if (!layer.image) return;
      const x = layer.x * w;
      const y = layer.y * h;
      const targetW = (layer.w || 0.4) * w;
      const targetH = (layer.h || 0.55) * h;

      // 1. Directional Soft Ground Contact Shadow
      if (layer.shadow && layer.shadow.enabled) {
        ctx.save();
        const shadowX = x + (layer.shadow.offsetX || 8);
        const shadowY = y + targetH / 2 + (layer.shadow.offsetY || 14);
        const shadowRx = targetW * 0.42;
        const shadowRy = Math.max(8, targetH * 0.08);

        const sGrad = ctx.createRadialGradient(shadowX, shadowY, 2, shadowX, shadowY, shadowRx);
        sGrad.addColorStop(0, layer.shadow.color || 'rgba(0, 0, 0, 0.7)');
        sGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
        sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Harmonized Person Cutout
      ctx.save();
      ctx.translate(x, y);
      if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
      if (layer.flipH) ctx.scale(-1, 1);

      // Auto-harmonization lighting & color temperature filter
      if (layer.harmonize && layer.harmonize.enabled) {
        const briMod = 100 + (layer.harmonize.brightness || 0);
        let hFilter = `brightness(${briMod}%)`;
        if (layer.harmonize.temperature > 0) {
          hFilter += ` sepia(${Math.min(45, layer.harmonize.temperature)}%)`;
        } else if (layer.harmonize.temperature < 0) {
          hFilter += ` hue-rotate(${Math.max(-45, layer.harmonize.temperature * 1.2)}deg)`;
        }
        ctx.filter = hFilter;
      }

      ctx.drawImage(layer.image, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.filter = 'none';

      // Selection bounding box with dashed border and corner handles
      if (layer.id === this.selectedLayerId) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-targetW / 2, -targetH / 2, targetW, targetH);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        const corners = [
          [-targetW / 2, -targetH / 2], [targetW / 2, -targetH / 2],
          [-targetW / 2, targetH / 2], [targetW / 2, targetH / 2]
        ];
        for (const [cx, cy] of corners) {
          ctx.fillRect(cx - 4, cy - 4, 8, 8);
        }
      }
      ctx.restore();
    }
  }

  drawArrow(ctx, fromX, fromY, toX, toY, color, width) {
    const headlen = 20;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  renderCropOverlay(ctx, w, h) {
    const r = this.cropRect;
    const cx = r.x * w;
    const cy = r.y * h;
    const cw = r.w * w;
    const ch = r.h * h;

    // Darkened border areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, cy); // Top
    ctx.fillRect(0, cy + ch, w, h - (cy + ch)); // Bottom
    ctx.fillRect(0, cy, cx, ch); // Left
    ctx.fillRect(cx + cw, cy, w - (cx + cw), ch); // Right

    // Rule of thirds grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.beginPath();
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + (cw * 2) / 3, cy);
    ctx.lineTo(cx + (cw * 2) / 3, cy + ch);
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + (ch * 2) / 3);
    ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
    ctx.stroke();

    // Glowing border outline
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
  }

  renderCompareSplit(ctx, w, h) {
    const splitX = w * this.compareSplit;
    ctx.save();

    // Redraw original unadjusted image on the left side
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.drawImage(this.baseImageOriginal, 0, 0, w, h);
    ctx.restore();

    // Split dividing line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();

    // Badges: "Original" vs "Edited"
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(splitX - 110, 20, 95, 32);
    ctx.fillRect(splitX + 15, 20, 85, 32);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('Original', splitX - 95, 42);
    ctx.fillText('Edited', splitX + 30, 42);
  }

  /* ==========================================================================
     TRANSFORMS & ADJUSTMENTS
     ========================================================================== */

  setAdjustment(param, value) {
    if (this.adjustments[param] !== undefined) {
      this.adjustments[param] = parseFloat(value);
      this.render();
      this.notifyStateChanged();
    }
  }

  resetAdjustments() {
    for (const k of Object.keys(this.adjustments)) {
      this.adjustments[k] = 0;
    }
    this.filter = 'none';
    this.render();
    this.saveHistory('Reset Adjustments');
    this.notifyStateChanged();
  }

  setFilter(filterName) {
    this.filter = filterName;
    this.render();
    this.saveHistory(`Filter: ${filterName}`);

    if (window.Gamification && filterName !== 'none') {
      window.Gamification.unlockAchievement('filter_fanatic');
      window.Gamification.addXP(15, `Filter: ${filterName}`);
    }
    this.notifyStateChanged();
  }

  rotate(deltaDeg) {
    this.rotation = (this.rotation + deltaDeg) % 360;
    this.render();
    this.saveHistory(`Rotate ${deltaDeg}°`);
    this.notifyStateChanged();
  }

  flip(axis) {
    if (axis === 'h') this.flipH = !this.flipH;
    if (axis === 'v') this.flipV = !this.flipV;
    this.render();
    this.saveHistory(`Flip ${axis.toUpperCase()}`);
    this.notifyStateChanged();
  }

  applyCrop() {
    if (!this.baseImage) return;
    const r = this.cropRect;
    const cropCanvas = document.createElement('canvas');
    const cw = Math.max(50, Math.round(this.width * r.w));
    const ch = Math.max(50, Math.round(this.height * r.h));
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const cctx = cropCanvas.getContext('2d');

    // Draw current canvas state cropped into new canvas
    cctx.drawImage(this.canvas, r.x * this.width, r.y * this.height, cw, ch, 0, 0, cw, ch);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      this.baseImage = croppedImg;
      this.width = cw;
      this.height = ch;
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.isCropping = false;
      this.cropRect = { x: 0, y: 0, w: 1, h: 1 };
      this.fitToViewport();
      this.render();
      this.saveHistory('Crop Image');
      this.notifyStateChanged();
    };
    croppedImg.src = cropCanvas.toDataURL('image/png');
  }

  /* ==========================================================================
     HISTORY (UNDO / REDO)
     ========================================================================== */

  saveHistory(actionName = 'Edit') {
    const snapshot = {
      action: actionName,
      timestamp: Date.now(),
      adjustments: { ...this.adjustments },
      rotation: this.rotation,
      flipH: this.flipH,
      flipV: this.flipV,
      filter: this.filter,
      layers: JSON.parse(JSON.stringify(this.layers))
    };

    // Slice forward history if we were in the middle of redo stack
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoUI();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreSnapshot(this.history[this.historyIndex]);
      if (window.Gamification) {
        window.Gamification.unlockAchievement('perfectionist');
      }
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreSnapshot(this.history[this.historyIndex]);
    }
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) return;
    this.adjustments = { ...snapshot.adjustments };
    this.rotation = snapshot.rotation;
    this.flipH = snapshot.flipH;
    this.flipV = snapshot.flipV;
    this.filter = snapshot.filter;
    this.layers = JSON.parse(JSON.stringify(snapshot.layers));

    // Update Slider inputs in DOM
    for (const [k, v] of Object.entries(this.adjustments)) {
      const slider = document.getElementById(`slider-${k}`);
      const valDisplay = document.getElementById(`val-${k}`);
      if (slider) slider.value = v;
      if (valDisplay) valDisplay.textContent = v;
    }

    this.updateLayersUI();
    this.render();
    this.updateUndoRedoUI();
    this.notifyStateChanged();
  }

  updateUndoRedoUI() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  /* ==========================================================================
     LAYER CREATION CONVENIENCE HELPERS
     ========================================================================== */

  addTextLayer(text = 'Hello World', opts = {}) {
    return this.addLayer({
      type: 'text',
      text: text,
      x: opts.x !== undefined ? opts.x : 0.5,
      y: opts.y !== undefined ? opts.y : 0.5,
      fontSize: opts.fontSize || 48,
      fontFamily: opts.font || opts.fontFamily || "'Plus Jakarta Sans', sans-serif",
      color: opts.color || '#ffffff',
      strokeColor: opts.strokeColor || '#000000',
      strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 2,
      shadowColor: opts.shadowColor || 'rgba(0, 0, 0, 0.7)',
      shadowBlur: opts.shadowBlur !== undefined ? opts.shadowBlur : 8,
      name: text.length > 15 ? text.slice(0, 15) + '...' : text
    });
  }

  addShapeLayer(shape = 'rect', opts = {}) {
    return this.addLayer({
      type: 'shape',
      shape: shape,
      x: opts.x !== undefined ? opts.x : 0.5,
      y: opts.y !== undefined ? opts.y : 0.5,
      w: opts.w || 0.3,
      h: opts.h || 0.2,
      fillColor: opts.fillColor || opts.color || 'rgba(59, 130, 246, 0.5)',
      strokeColor: opts.strokeColor || '#3b82f6',
      strokeWidth: opts.strokeWidth || 3,
      name: shape.toUpperCase() + ' Shape'
    });
  }

  addStickerLayer(emoji = '✨', opts = {}) {
    return this.addLayer({
      type: 'sticker',
      emoji: emoji,
      x: opts.x !== undefined ? opts.x : 0.5,
      y: opts.y !== undefined ? opts.y : 0.5,
      size: opts.size || 64,
      rotation: opts.rotation || 0,
      name: `Sticker ${emoji}`
    });
  }

  addPersonLayer(imageEl, opts = {}) {
    return this.addLayer({
      type: 'person',
      image: imageEl,
      x: opts.x !== undefined ? opts.x : 0.5,
      y: opts.y !== undefined ? opts.y : 0.65,
      w: opts.w || 0.38,
      h: opts.h || 0.55,
      shadow: opts.shadow || { enabled: true, color: 'rgba(0, 0, 0, 0.6)', offsetX: 6, offsetY: 12 },
      harmonize: opts.harmonize || { enabled: true, temperature: 15, brightness: 0 },
      name: 'Person Cutout'
    });
  }

  /* ==========================================================================
     STATE OBJECT & NOTIFICATIONS
     ========================================================================== */

  getState() {
    return this.getStateObject();
  }

  getStateObject() {
    return {
      hasImage: this.hasImage,
      dimensions: { width: this.width, height: this.height },
      adjustments: { ...this.adjustments },
      filter: this.filter,
      rotation: this.rotation,
      layers: JSON.parse(JSON.stringify(this.layers)),
      activeTool: this.activeTool,
      historyLength: this.history.length
    };
  }

  notifyStateChanged(action = 'edit', detail = {}) {
    const state = this.getStateObject();
    window.dispatchEvent(new CustomEvent('pux:state-changed', {
      detail: { action, detail, state }
    }));
    if (window.RuleEngine && window.Mascot) {
      window.RuleEngine.evaluateState(state, window.Mascot.personality, window.Mascot.roastLevel);
    }
  }

  /* ==========================================================================
     EXPORT
     ========================================================================== */

  exportImage(format = 'image/png', scale = 1, quality = 0.95, filename = 'pux-pilot-creation') {
    if (!this.canvas) return;

    // Create high-res target canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width * scale;
    exportCanvas.height = this.height * scale;
    const eCtx = exportCanvas.getContext('2d');
    eCtx.scale(scale, scale);

    // Render cleanly onto export canvas
    const origCtx = this.ctx;
    this.ctx = eCtx;
    this.render();
    this.ctx = origCtx;

    let dataUrl;
    try {
      dataUrl = exportCanvas.toDataURL(format, quality);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed because the current image does not allow browser downloads. Upload your image directly, then try again.');
      return;
    }
    const link = document.createElement('a');
    const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
    const cleanName = String(filename || 'pux-pilot-creation').trim().replace(/[\\/:*?\"<>|]+/g, '-') || 'pux-pilot-creation';
    link.download = `${cleanName}.${ext}`;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (window.Gamification) {
      window.Gamification.unlockAchievement('master_export');
      window.Gamification.addXP(50, 'Exported Master Image');
    }
  }

  /* ==========================================================================
     CANVAS EVENT LISTENERS (Dragging, Drawing, Panning)
     ========================================================================== */

  bindEvents() {
    if (!this.canvas) return;

    // Pointer coordinates helper
    const getCanvasCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) / (rect.width / this.width);
      const y = (clientY - rect.top) / (rect.height / this.height);
      return {
        x: Math.max(0, Math.min(this.width, x)),
        y: Math.max(0, Math.min(this.height, y)),
        normX: x / this.width,
        normY: y / this.height
      };
    };

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      const coords = getCanvasCoords(e);

      // 1. Brush / Drawing Tool
      if (this.activeTool === 'brush') {
        this.brush.isDrawing = true;
        const newBrushLayer = {
          type: 'brush',
          color: this.brush.color,
          size: this.brush.size,
          points: [{ x: coords.normX, y: coords.normY }]
        };
        this.addLayer(newBrushLayer);
        return;
      }

      // 2. Layer Dragging / Selection
      if (this.activeTool === 'select') {
        // Hit test layers in reverse order
        let hitLayer = null;
        for (let i = this.layers.length - 1; i >= 0; i--) {
          const l = this.layers[i];
          if (!l.visible || l.locked) continue;
          const lx = l.x * this.width;
          const ly = l.y * this.height;
          const dist = Math.sqrt(Math.pow(coords.x - lx, 2) + Math.pow(coords.y - ly, 2));
          if (dist < 80) {
            hitLayer = l;
            break;
          }
        }

        if (hitLayer) {
          this.selectedLayerId = hitLayer.id;
          this.isDraggingLayer = true;
          this.dragOffset = { x: coords.normX - hitLayer.x, y: coords.normY - hitLayer.y };
          this.updateLayersUI();
        }
      }
    });

    // Mouse Move
    window.addEventListener('mousemove', (e) => {
      if (this.brush.isDrawing) {
        const coords = getCanvasCoords(e);
        const activeLayer = this.getSelectedLayer();
        if (activeLayer && activeLayer.type === 'brush') {
          activeLayer.points.push({ x: coords.normX, y: coords.normY });
          this.render();
        }
      } else if (this.isDraggingLayer) {
        const coords = getCanvasCoords(e);
        const layer = this.getSelectedLayer();
        if (layer) {
          layer.x = coords.normX - this.dragOffset.x;
          layer.y = coords.normY - this.dragOffset.y;
          this.render();
        }
      }
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      if (this.brush.isDrawing) {
        this.brush.isDrawing = false;
        this.saveHistory('Brush Stroke');
        this.notifyStateChanged();
      }
      if (this.isDraggingLayer) {
        this.isDraggingLayer = false;
        this.saveHistory('Move Layer');
        this.notifyStateChanged();
      }
    });

    // Zoom on wheel
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      this.setZoom(zoomFactor);
    }, { passive: false });
  }
}

window.CanvasEngine = CanvasEngine;
