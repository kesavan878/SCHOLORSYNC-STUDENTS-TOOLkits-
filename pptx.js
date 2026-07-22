/**
 * ScholarSync - Photos to PPTX Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  setupPhotosToPptx();
});

function setupPhotosToPptx() {
  const uploadZone = document.getElementById('pptx-upload-zone');
  const fileInput = document.getElementById('pptx-file-input');
  const slidesContainer = document.getElementById('pptx-slides-list');
  const emptyState = document.getElementById('pptx-empty-state');
  const slideCountBadge = document.getElementById('pptx-slide-count');
  
  const titleInput = document.getElementById('pptx-title-input');
  const layoutSelect = document.getElementById('pptx-layout');
  const ratioSelect = document.getElementById('pptx-ratio');
  const bgColorSelect = document.getElementById('pptx-bg-color');
  const titleColorSelect = document.getElementById('pptx-title-color');
  
  const generateBtn = document.getElementById('btn-generate-pptx');

  // State
  let slidesList = [];
  let slideCounter = 0;

  // Drag & drop handlers
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
      handleFiles(e.dataTransfer.files);
    }
  });

  // Clicking the upload zone opens the file selector
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  // Handle files selection
  function handleFiles(files) {
    const validImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (validImageFiles.length === 0) {
      window.showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
      return;
    }

    let loadedCount = 0;
    const totalToLoad = validImageFiles.length;
    window.showToast(`Loading ${totalToLoad} image${totalToLoad > 1 ? 's' : ''}...`, 'info');

    validImageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // Measure image dimensions for aspect ratio calculations
        const img = new Image();
        img.onload = () => {
          slideCounter++;
          slidesList.push({
            id: `slide_${slideCounter}_${Date.now()}`,
            name: file.name,
            dataUrl: dataUrl,
            width: img.width,
            height: img.height,
            title: '' // Empty by default, customizable by user
          });
          
          loadedCount++;
          if (loadedCount === totalToLoad) {
            renderSlides();
            window.showToast(`Loaded ${totalToLoad} image${totalToLoad > 1 ? 's' : ''} successfully!`, 'success');
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // Reset file input value to allow uploading same file again if needed
    fileInput.value = '';
  }

  // Render slides list
  function renderSlides() {
    slidesContainer.innerHTML = '';
    
    if (slidesList.length === 0) {
      emptyState.classList.remove('hidden');
      slidesContainer.classList.add('hidden');
      generateBtn.disabled = true;
      slideCountBadge.textContent = '0 Slides';
      return;
    }

    emptyState.classList.add('hidden');
    slidesContainer.classList.remove('hidden');
    generateBtn.disabled = false;
    slideCountBadge.textContent = `${slidesList.length} Slide${slidesList.length > 1 ? 's' : ''}`;

    slidesList.forEach((slide, index) => {
      const slideItem = document.createElement('div');
      slideItem.className = 'pptx-slide-item';
      slideItem.setAttribute('data-id', slide.id);
      
      slideItem.innerHTML = `
        <img class="pptx-slide-thumb" src="${slide.dataUrl}" alt="Slide thumbnail">
        
        <div class="pptx-slide-details">
          <div class="pptx-slide-name" title="${slide.name}">${index + 1}. ${slide.name}</div>
          <input type="text" class="pptx-slide-title-input" placeholder="Add slide title/caption (optional)" value="${escapeHtml(slide.title)}">
        </div>
        
        <div class="pptx-slide-actions">
          <button class="pptx-action-btn move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button class="pptx-action-btn move-down" title="Move Down" ${index === slidesList.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button class="pptx-action-btn delete" title="Delete Slide">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;

      // Event listeners for individual inputs/buttons
      const titleInputEl = slideItem.querySelector('.pptx-slide-title-input');
      titleInputEl.addEventListener('input', (e) => {
        slide.title = e.target.value;
      });

      const moveUpBtn = slideItem.querySelector('.move-up');
      moveUpBtn.addEventListener('click', () => {
        if (index > 0) {
          // Swap slides
          const temp = slidesList[index];
          slidesList[index] = slidesList[index - 1];
          slidesList[index - 1] = temp;
          renderSlides();
        }
      });

      const moveDownBtn = slideItem.querySelector('.move-down');
      moveDownBtn.addEventListener('click', () => {
        if (index < slidesList.length - 1) {
          // Swap slides
          const temp = slidesList[index];
          slidesList[index] = slidesList[index + 1];
          slidesList[index + 1] = temp;
          renderSlides();
        }
      });

      const deleteBtn = slideItem.querySelector('.delete');
      deleteBtn.addEventListener('click', () => {
        slidesList.splice(index, 1);
        renderSlides();
        window.showToast('Slide removed.', 'info');
      });

      slidesContainer.appendChild(slideItem);
    });
  }

  // Compile PPTX using PptxGenJS
  generateBtn.addEventListener('click', async () => {
    if (slidesList.length === 0) return;

    generateBtn.disabled = true;
    const originalContent = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner spinner-icon"></i> Compiling Presentation...';

    try {
      // Initialize library
      const pptx = new PptxGenJS();
      
      // Configuration parameters
      const ratio = ratioSelect.value;
      const layoutType = layoutSelect.value;
      const bgColor = bgColorSelect.value; // Hex value
      const titleColor = titleColorSelect.value; // Hex value
      const mainTitle = titleInput.value.trim();

      // Configure presentation dimension
      pptx.layout = ratio === '16:9' ? 'LAYOUT_169' : 'LAYOUT_43';
      
      // Slide Dimensions in inches (PptxGenJS coordinate space)
      // 16:9 = 10 x 5.625 inches
      // 4:3  = 10 x 7.5 inches
      const slideW = 10.0;
      const slideH = ratio === '16:9' ? 5.625 : 7.5;

      // 1. Cover Slide (if presentation title exists)
      if (mainTitle) {
        const coverSlide = pptx.addSlide();
        coverSlide.background = { color: bgColor };
        
        coverSlide.addText(mainTitle, {
          x: 1.0,
          y: slideH / 2 - 1.0,
          w: slideW - 2.0,
          h: 2.0,
          align: 'center',
          fontSize: 32,
          bold: true,
          color: titleColor,
          fontFace: 'Outfit'
        });
      }

      // 2. Loop through images and add to slides
      slidesList.forEach((slideItem, index) => {
        const slide = pptx.addSlide();
        slide.background = { color: bgColor };

        const showTitle = layoutType === 'title-image' && slideItem.title.trim().length > 0;
        
        // Let's place the custom title if it exists
        if (slideItem.title.trim().length > 0) {
          slide.addText(slideItem.title.trim(), {
            x: 0.5,
            y: 0.4,
            w: slideW - 1.0,
            h: 0.6,
            fontSize: 20,
            bold: true,
            color: titleColor,
            fontFace: 'Outfit'
          });
        }

        // Image boundary layout calculations
        let imgX = 0;
        let imgY = 0;
        let imgW = slideW;
        let imgH = slideH;

        if (layoutType === 'fill') {
          // Stretch/Crop full screen
          imgX = 0;
          imgY = 0;
          imgW = slideW;
          imgH = slideH;
        } else {
          // Default: Fit aspect ratio
          // Determine bounding box for image
          let boxX = 0.5;
          let boxY = 0.5;
          let boxW = slideW - 1.0;
          let boxH = slideH - 1.0;

          // If showing a title text, shift image down
          if (slideItem.title.trim().length > 0) {
            boxY = 1.1;
            boxH = slideH - 1.6;
          }

          const imgRatio = slideItem.width / slideItem.height;
          const boxRatio = boxW / boxH;

          if (imgRatio > boxRatio) {
            // Width limited
            imgW = boxW;
            imgH = boxW / imgRatio;
            imgX = boxX;
            imgY = boxY + (boxH - imgH) / 2;
          } else {
            // Height limited
            imgH = boxH;
            imgW = boxH * imgRatio;
            imgX = boxX + (boxW - imgW) / 2;
            imgY = boxY;
          }
        }

        // Add Image
        slide.addImage({
          data: slideItem.dataUrl,
          x: imgX,
          y: imgY,
          w: imgW,
          h: imgH
        });
      });

      // Write and download
      const fileName = (mainTitle ? mainTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'photos_presentation') + '.pptx';
      await pptx.writeFile({ fileName: fileName });
      
      window.showToast('PowerPoint Presentation generated!', 'success');

    } catch (error) {
      console.error(error);
      window.showToast('Failed to compile PowerPoint file.', 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalContent;
    }
  });

  // Helper to escape HTML characters
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
