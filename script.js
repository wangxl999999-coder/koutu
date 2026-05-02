class ImageEditor {
    constructor() {
        this.originalImage = null;
        this.originalCanvas = document.getElementById('tempCanvas');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.resultCtx = this.resultCanvas.getContext('2d');
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.originalImageEl = document.getElementById('originalImage');
        this.removeImageBtn = document.getElementById('removeImage');
        
        this.cutoutType = document.querySelectorAll('input[name="cutoutType"]');
        this.bgColor = document.querySelectorAll('input[name="bgColor"]');
        this.customColor = document.getElementById('customColor');
        
        this.brightness = document.getElementById('brightness');
        this.contrast = document.getElementById('contrast');
        this.sharpen = document.getElementById('sharpen');
        
        this.tolerance = document.getElementById('tolerance');
        this.toleranceValue = document.getElementById('toleranceValue');
        
        this.cutoutBtn = document.getElementById('cutoutBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.resultPlaceholder = document.getElementById('resultPlaceholder');
        this.resultContainer = document.getElementById('resultContainer');
        
        this.presetCards = document.querySelectorAll('.preset-card');
    }
    
    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeImageBtn.addEventListener('click', () => this.removeImage());
        
        this.tolerance.addEventListener('input', (e) => {
            this.toleranceValue.textContent = e.target.value + '%';
        });
        
        this.cutoutBtn.addEventListener('click', () => this.processImage());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        this.presetCards.forEach(card => {
            card.addEventListener('click', () => this.applyPreset(card.dataset.preset));
        });
        
        this.bgColor.forEach(radio => {
            radio.addEventListener('change', () => this.updateCustomColorDisplay());
        });
        
        this.customColor.addEventListener('input', () => {
            this.updateCustomColorDisplay();
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && this.isImageFile(files[0])) {
            this.loadImage(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0 && this.isImageFile(files[0])) {
            this.loadImage(files[0]);
        }
    }
    
    isImageFile(file) {
        return file.type.startsWith('image/');
    }
    
    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.originalImageEl.src = e.target.result;
                this.imagePreview.style.display = 'block';
                this.uploadArea.style.display = 'none';
                this.cutoutBtn.disabled = false;
                this.resetBtn.disabled = false;
                
                this.originalCanvas.width = img.width;
                this.originalCanvas.height = img.height;
                this.originalCtx.drawImage(img, 0, 0);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    removeImage() {
        this.originalImage = null;
        this.imagePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.cutoutBtn.disabled = true;
        this.resetBtn.disabled = true;
        this.resultPlaceholder.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.fileInput.value = '';
    }
    
    processImage() {
        if (!this.originalImage) return;
        
        const tolerance = parseInt(this.tolerance.value);
        const cutoutType = this.getCutoutType();
        const bgColor = this.getBgColor();
        const enhanceOptions = {
            brightness: this.brightness.checked,
            contrast: this.contrast.checked,
            sharpen: this.sharpen.checked
        };
        
        this.resultCanvas.width = this.originalImage.width;
        this.resultCanvas.height = this.originalImage.height;
        
        this.resultCtx.drawImage(this.originalImage, 0, 0);
        
        if (cutoutType === 'portrait') {
            this.autoRemoveBackground(tolerance, bgColor);
        } else {
            this.autoRemoveBackground(tolerance, bgColor);
        }
        
        if (enhanceOptions.brightness) {
            this.adjustBrightness(20);
        }
        
        if (enhanceOptions.contrast) {
            this.adjustContrast(20);
        }
        
        if (enhanceOptions.sharpen) {
            this.applySharpen();
        }
        
        this.resultPlaceholder.style.display = 'none';
        this.resultContainer.style.display = 'block';
    }
    
    getCutoutType() {
        const selected = document.querySelector('input[name="cutoutType"]:checked');
        return selected ? selected.value : 'portrait';
    }
    
    getBgColor() {
        const selected = document.querySelector('input[name="bgColor"]:checked');
        const value = selected ? selected.value : 'transparent';
        
        if (value === 'transparent') return null;
        if (value === 'custom') return this.customColor.value;
        
        const colorMap = {
            'white': '#ffffff',
            'blue': '#007bff',
            'red': '#dc3545'
        };
        
        return colorMap[value] || null;
    }
    
    updateCustomColorDisplay() {
        const customColor = document.querySelector('input[name="bgColor"][value="custom"]');
        if (customColor) {
            const swatch = customColor.nextElementSibling;
            if (swatch && swatch.classList.contains('color-swatch')) {
                swatch.style.background = this.customColor.value;
            }
        }
    }
    
    autoRemoveBackground(tolerance, bgColor) {
        const imageData = this.resultCtx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        const data = imageData.data;
        const width = this.resultCanvas.width;
        const height = this.resultCanvas.height;
        
        const bgColorTolerance = (tolerance / 100) * 255;
        
        const corners = [
            [10, 10],
            [width - 10, 10],
            [10, height - 10],
            [width - 10, height - 10]
        ];
        
        const sampleColors = corners.map(([x, y]) => {
            const idx = (y * width + x) * 4;
            return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
        });
        
        const avgBgColor = {
            r: Math.round(sampleColors.reduce((sum, c) => sum + c.r, 0) / 4),
            g: Math.round(sampleColors.reduce((sum, c) => sum + c.g, 0) / 4),
            b: Math.round(sampleColors.reduce((sum, c) => sum + c.b, 0) / 4)
        };
        
        const visited = new Set();
        const queue = [];
        
        for (let x = 0; x < width; x++) {
            if (this.isSimilarColor(data, width, x, 0, avgBgColor, bgColorTolerance)) {
                queue.push([x, 0]);
            }
            if (this.isSimilarColor(data, width, x, height - 1, avgBgColor, bgColorTolerance)) {
                queue.push([x, height - 1]);
            }
        }
        
        for (let y = 0; y < height; y++) {
            if (this.isSimilarColor(data, width, 0, y, avgBgColor, bgColorTolerance)) {
                queue.push([0, y]);
            }
            if (this.isSimilarColor(data, width, width - 1, y, avgBgColor, bgColorTolerance)) {
                queue.push([width - 1, y]);
            }
        }
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            if (this.isSimilarColor(data, width, x, y, avgBgColor, bgColorTolerance)) {
                visited.add(key);
                
                const idx = (y * width + x) * 4;
                if (bgColor) {
                    const rgb = this.hexToRgb(bgColor);
                    data[idx] = rgb.r;
                    data[idx + 1] = rgb.g;
                    data[idx + 2] = rgb.b;
                    data[idx + 3] = 255;
                } else {
                    data[idx + 3] = 0;
                }
                
                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }
        
        const edgeTolerance = bgColorTolerance * 0.8;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] < 255) continue;
                
                let nearBackground = false;
                for (let dy = -2; dy <= 2 && !nearBackground; dy++) {
                    for (let dx = -2; dx <= 2 && !nearBackground; dx++) {
                        if (dy === 0 && dx === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = (ny * width + nx) * 4;
                            if (data[nidx + 3] < 255) {
                                nearBackground = true;
                            }
                        }
                    }
                }
                
                if (nearBackground) {
                    if (this.isSimilarColor(data, width, x, y, avgBgColor, edgeTolerance)) {
                        if (bgColor) {
                            const rgb = this.hexToRgb(bgColor);
                            data[idx] = rgb.r;
                            data[idx + 1] = rgb.g;
                            data[idx + 2] = rgb.b;
                        } else {
                            data[idx + 3] = 0;
                        }
                    }
                }
            }
        }
        
        this.resultCtx.putImageData(imageData, 0, 0);
    }
    
    isSimilarColor(data, width, x, y, targetColor, tolerance) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const distance = Math.sqrt(
            Math.pow(r - targetColor.r, 2) +
            Math.pow(g - targetColor.g, 2) +
            Math.pow(b - targetColor.b, 2)
        );
        
        return distance <= tolerance;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    adjustBrightness(value) {
        const imageData = this.resultCtx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            data[i] = Math.min(255, Math.max(0, data[i] + value));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
        }
        
        this.resultCtx.putImageData(imageData, 0, 0);
    }
    
    adjustContrast(value) {
        const imageData = this.resultCtx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        
        this.resultCtx.putImageData(imageData, 0, 0);
    }
    
    applySharpen() {
        const imageData = this.resultCtx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        const data = imageData.data;
        const width = this.resultCanvas.width;
        const height = this.resultCanvas.height;
        
        const outputData = new Uint8ClampedArray(data);
        const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const weightSum = 1;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] === 0) continue;
                
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kidx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = weights[(ky + 1) * 3 + (kx + 1)];
                        r += data[kidx] * weight;
                        g += data[kidx + 1] * weight;
                        b += data[kidx + 2] * weight;
                    }
                }
                
                outputData[idx] = Math.min(255, Math.max(0, r / weightSum));
                outputData[idx + 1] = Math.min(255, Math.max(0, g / weightSum));
                outputData[idx + 2] = Math.min(255, Math.max(0, b / weightSum));
            }
        }
        
        const outputImageData = new ImageData(outputData, width, height);
        this.resultCtx.putImageData(outputImageData, 0, 0);
    }
    
    applyPreset(preset) {
        this.brightness.checked = false;
        this.contrast.checked = false;
        this.sharpen.checked = false;
        
        const radios = document.querySelectorAll('input[name="bgColor"]');
        radios.forEach(radio => {
            if (radio.value === 'transparent') {
                radio.checked = true;
            }
        });
        
        const cutoutRadios = document.querySelectorAll('input[name="cutoutType"]');
        cutoutRadios.forEach(radio => {
            if (radio.value === 'general') {
                radio.checked = true;
            }
        });
        
        switch (preset) {
            case 'white-to-blue':
                cutoutRadios.forEach(radio => {
                    if (radio.value === 'portrait') radio.checked = true;
                });
                radios.forEach(radio => {
                    if (radio.value === 'blue') radio.checked = true;
                });
                this.tolerance.value = 20;
                this.toleranceValue.textContent = '20%';
                break;
                
            case 'product-cutout':
                cutoutRadios.forEach(radio => {
                    if (radio.value === 'general') radio.checked = true;
                });
                radios.forEach(radio => {
                    if (radio.value === 'transparent') radio.checked = true;
                });
                this.brightness.checked = true;
                this.contrast.checked = true;
                this.tolerance.value = 30;
                this.toleranceValue.textContent = '30%';
                break;
                
            case 'portrait-beautify':
                cutoutRadios.forEach(radio => {
                    if (radio.value === 'portrait') radio.checked = true;
                });
                radios.forEach(radio => {
                    if (radio.value === 'white') radio.checked = true;
                });
                this.brightness.checked = true;
                this.contrast.checked = true;
                this.sharpen.checked = true;
                this.tolerance.value = 25;
                this.toleranceValue.textContent = '25%';
                break;
                
            case 'transparent-bg':
                cutoutRadios.forEach(radio => {
                    if (radio.value === 'general') radio.checked = true;
                });
                radios.forEach(radio => {
                    if (radio.value === 'transparent') radio.checked = true;
                });
                this.tolerance.value = 35;
                this.toleranceValue.textContent = '35%';
                break;
        }
    }
    
    reset() {
        this.brightness.checked = false;
        this.contrast.checked = false;
        this.sharpen.checked = false;
        this.tolerance.value = 30;
        this.toleranceValue.textContent = '30%';
        
        const radios = document.querySelectorAll('input[name="bgColor"]');
        radios.forEach(radio => {
            if (radio.value === 'transparent') {
                radio.checked = true;
            }
        });
        
        const cutoutRadios = document.querySelectorAll('input[name="cutoutType"]');
        cutoutRadios.forEach(radio => {
            if (radio.value === 'portrait') {
                radio.checked = true;
            }
        });
        
        this.resultPlaceholder.style.display = 'block';
        this.resultContainer.style.display = 'none';
    }
    
    downloadImage() {
        const link = document.createElement('a');
        link.download = 'koutu-result.png';
        link.href = this.resultCanvas.toDataURL('image/png');
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
});