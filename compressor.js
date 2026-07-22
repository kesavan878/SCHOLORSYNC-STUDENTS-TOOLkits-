/**
 * ScholarSync - Photo Compressor Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  setupCompressor();
});

function setupCompressor() {
  const uploadZone = document.getElementById('img-upload-zone');
  const fileInput = document.getElementById('img-file-input');
  const fileInfo = document.getElementById('img-file-info');
  const removeBtn = document.getElementById('remove-img-btn');
  const compressorControls = document.getElementById('compressor-controls');
  
  const qualitySlider = document.getElementById('quality-slider');
  const qualityVal = document.getElementById('quality-val');
  const scaleSlider = document.getElementById('scale-slider');
  const scaleVal = document.getElementById('scale-val');
  const imgFormatSelect = document.getElementById('img-format');
  const origDimensionsText = document.getElementById('orig-dimensions');
  
  const btnCompress = document.getElementById('btn-compress');
  
  // Preview panels
  const origImg = document.getElementById('img-orig-preview');
  const origSizeText = document.getElementById('orig-size');
  const compImg = document.getElementById('img-comp-preview');
  const compSizeText = document.getElementById('comp-size');
  const resultsPanel = document.getElementById('compression-results-panel');
  const reductionRatioText = document.getElementById('reduction-ratio');
  const btnDownloadCompressed = document.getElementById('btn-download-compressed');
  
  const originalPlaceholders = document.querySelectorAll('#original-preview-panel .preview-placeholder');
  const compressedPlaceholders = document.querySelectorAll('#compressed-preview-panel .preview-placeholder');

  let activeImgFile = null;
  let activeImageObj = null; // Stored image object for redrawing
  let compressedBlob = null; // Store compressed blob for download

  // Upload actions
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageSelect(e.target.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCompressorState();
  });

  // Slider actions to update indicators
  qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = `${qualitySlider.value}%`;
  });

  scaleSlider.addEventListener('input', () => {
    scaleVal.textContent = `${scaleSlider.value}%`;
  });

  // Auto-compress when slider values change or format changes
  [qualitySlider, scaleSlider, imgFormatSelect].forEach(control => {
    control.addEventListener('change', () => {
      if (activeImageObj) {
        compressImage();
      }
    });
  });

  btnCompress.addEventListener('click', () => {
    if (activeImageObj) {
      compressImage();
    }
  });

  btnDownloadCompressed.addEventListener('click', () => {
    if (!compressedBlob) return;
    
    // Choose appropriate file extension
    let extension = '.jpg';
    if (imgFormatSelect.value === 'image/png') extension = '.png';
    if (imgFormatSelect.value === 'image/webp') extension = '.webp';
    
    const baseName = activeImgFile.name.replace(/\.[^/.]+$/, '');
    const downloadName = `${baseName}_compressed${extension}`;
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(compressedBlob);
    downloadLink.download = downloadName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    window.showToast('Compressed image downloaded!', 'success');
  });

  function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
      window.showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }
    activeImgFile = file;

    // Show upload info
    uploadZone.querySelector('.upload-prompt').classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileInfo.querySelector('.file-name').textContent = file.name;
    fileInfo.querySelector('.file-size').textContent = window.formatBytes(file.size);
    compressorControls.classList.remove('disabled-overlay');

    // Read image for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgDataUrl = e.target.result;
      
      // Load image object
      activeImageObj = new Image();
      activeImageObj.onload = () => {
        // Display dimensions
        origDimensionsText.textContent = `${activeImageObj.width} × ${activeImageObj.height} px`;
        
        // Update Original Preview UI
        origImg.src = imgDataUrl;
        origImg.classList.remove('hidden');
        originalPlaceholders.forEach(p => p.classList.add('hidden'));
        origSizeText.textContent = `Original: ${window.formatBytes(file.size)}`;

        // Run initial compression
        compressImage();
      };
      activeImageObj.src = imgDataUrl;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Compress image locally using Canvas
   */
  function compressImage() {
    if (!activeImageObj) return;

    btnCompress.disabled = true;
    btnCompress.innerHTML = '<i class="fa-solid fa-spinner spinner-icon"></i> Compressing...';

    // Calculate dimensions
    const scale = scaleSlider.value / 100;
    const targetWidth = Math.round(activeImageObj.width * scale);
    const targetHeight = Math.round(activeImageObj.height * scale);

    // Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Draw and scale image
    ctx.drawImage(activeImageObj, 0, 0, targetWidth, targetHeight);

    // Compress
    const mimeType = imgFormatSelect.value;
    const quality = qualitySlider.value / 100;

    canvas.toBlob((blob) => {
      if (!blob) {
        window.showToast('Compression failed.', 'error');
        btnCompress.disabled = false;
        btnCompress.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Compress Image';
        return;
      }

      compressedBlob = blob;

      // Update Compressed Preview UI
      const blobUrl = URL.createObjectURL(blob);
      compImg.src = blobUrl;
      compImg.classList.remove('hidden');
      compressedPlaceholders.forEach(p => p.classList.add('hidden'));
      compSizeText.textContent = `Compressed: ${window.formatBytes(blob.size)}`;

      // Calculate reduction
      const origSize = activeImgFile.size;
      const compSize = blob.size;
      const reduction = ((origSize - compSize) / origSize) * 100;

      if (reduction > 0) {
        reductionRatioText.textContent = `-${reduction.toFixed(1)}%`;
        reductionRatioText.className = 'metric-val text-green';
      } else {
        // Size increased (can happen if setting quality=100% on a already highly compressed image)
        reductionRatioText.textContent = `+${Math.abs(reduction).toFixed(1)}%`;
        reductionRatioText.className = 'metric-val text-red';
      }

      resultsPanel.classList.remove('hidden');
      btnCompress.disabled = false;
      btnCompress.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Compress Image';
      window.showToast('Image compressed successfully!', 'success');
      
    }, mimeType, quality);
  }

  function resetCompressorState() {
    activeImgFile = null;
    activeImageObj = null;
    compressedBlob = null;
    fileInput.value = '';
    
    // UI resets
    uploadZone.querySelector('.upload-prompt').classList.remove('hidden');
    fileInfo.classList.add('hidden');
    compressorControls.classList.add('disabled-overlay');
    
    origDimensionsText.textContent = '-';
    
    origImg.src = '';
    origImg.classList.add('hidden');
    originalPlaceholders.forEach(p => p.classList.remove('hidden'));
    origSizeText.textContent = '-';
    
    compImg.src = '';
    compImg.classList.add('hidden');
    compressedPlaceholders.forEach(p => p.classList.remove('hidden'));
    compSizeText.textContent = '-';
    
    resultsPanel.classList.add('hidden');
    
    qualitySlider.value = 80;
    qualityVal.textContent = '80%';
    scaleSlider.value = 100;
    scaleVal.textContent = '100%';
    imgFormatSelect.value = 'image/jpeg';
  }
}
