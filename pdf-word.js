/**
 * ScholarSync - PDF & Word Tools Logic
 */

// Initialize PDFJS Global Worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {
  setupPdfToWord();
  setupWordToPdf();
  setupEditorToolbar();
});

// State for files
let pdfFile = null;
let wordFile = null;

// ==========================================
// 1. PDF TO WORD CONVERTER
// ==========================================
function setupPdfToWord() {
  const uploadZone = document.getElementById('pdf-upload-zone');
  const fileInput = document.getElementById('pdf-file-input');
  const fileInfo = document.getElementById('pdf-file-info');
  const actions = document.getElementById('pdf-actions');
  const removeBtn = document.getElementById('remove-pdf-btn');
  const convertBtn = document.getElementById('btn-convert-pdf');
  const spinner = document.getElementById('pdf-spinner');
  
  const statusBox = document.getElementById('pdf-status-box');
  const progressBar = document.getElementById('pdf-progress');
  const statusMsg = document.getElementById('pdf-status-msg');

  // Drag and drop event listeners
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
      handlePdfSelect(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handlePdfSelect(e.target.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetPdfState();
  });

  convertBtn.addEventListener('click', async () => {
    if (!pdfFile) return;
    
    // Show spinner & progress
    convertBtn.disabled = true;
    spinner.classList.remove('hidden');
    statusBox.classList.remove('hidden');
    progressBar.style.width = '0%';
    statusMsg.textContent = 'Reading PDF file...';
    
    try {
      const arrayBuffer = await readFileAsArrayBuffer(pdfFile);
      const docHtml = await parsePdfToHtml(arrayBuffer, (percent, msg) => {
        progressBar.style.width = `${percent}%`;
        statusMsg.textContent = msg;
      });

      // Package HTML as Word Document
      statusMsg.textContent = 'Generating Microsoft Word Document...';
      progressBar.style.width = '95%';
      
      const wordDocumentBlob = convertHtmlToDocBlob(docHtml, pdfFile.name.replace(/\.[^/.]+$/, ''));
      
      // Download file
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(wordDocumentBlob);
      downloadLink.download = pdfFile.name.replace(/\.pdf$/i, '') + '.doc';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      progressBar.style.width = '100%';
      statusMsg.textContent = 'Conversion Complete! Document downloaded.';
      window.showToast('PDF successfully converted to Word!', 'success');
      
    } catch (error) {
      console.error(error);
      statusMsg.textContent = 'An error occurred during conversion.';
      window.showToast('Failed to convert PDF. Ensure it has readable text layers.', 'error');
    } finally {
      convertBtn.disabled = false;
      spinner.classList.add('hidden');
    }
  });

  function handlePdfSelect(file) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      window.showToast('Please select a valid PDF file.', 'error');
      return;
    }
    pdfFile = file;
    
    // UI update
    uploadZone.querySelector('.upload-prompt').classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileInfo.querySelector('.file-name').textContent = file.name;
    fileInfo.querySelector('.file-size').textContent = window.formatBytes(file.size);
    actions.classList.remove('hidden');
    statusBox.classList.add('hidden');
  }

  function resetPdfState() {
    pdfFile = null;
    fileInput.value = '';
    uploadZone.querySelector('.upload-prompt').classList.remove('hidden');
    fileInfo.classList.add('hidden');
    actions.classList.add('hidden');
    statusBox.classList.add('hidden');
  }
}

/**
 * Extract structured text from PDF.js ArrayBuffer
 */
async function parsePdfToHtml(arrayBuffer, onProgress) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  
  let fullHtml = '';
  
  for (let i = 1; i <= numPages; i++) {
    onProgress(Math.floor((i / numPages) * 90), `Extracting text from page ${i} of ${numPages}...`);
    
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort text items by vertical height Y and horizontal spacing X
    // PDF.js coordinates start from bottom-left Y=0 to top Y=height
    const items = textContent.items;
    
    // Group text items by their vertical coordinate Y
    const rows = {};
    items.forEach(item => {
      // Round Y to aggregate lines that are slightly offset
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push(item);
    });
    
    // Sort Y coordinates descending (top of the page first)
    const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
    
    let pageHtml = '';
    
    sortedY.forEach(y => {
      // Sort items on the same row horizontally (left to right)
      const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
      let lineText = '';
      rowItems.forEach(item => {
        lineText += item.str + ' ';
      });
      
      const trimmed = lineText.trim();
      if (trimmed.length > 0) {
        // Detect basic structures
        if (trimmed.length < 50 && (trimmed.startsWith('Chapter') || trimmed.toUpperCase() === trimmed)) {
          pageHtml += `<h2>${trimmed}</h2>`;
        } else {
          pageHtml += `<p>${trimmed}</p>`;
        }
      }
    });
    
    fullHtml += pageHtml;
    
    // Add page break visual in Word
    if (i < numPages) {
      fullHtml += '<br style="page-break-before:always;" />';
    }
  }
  
  return fullHtml;
}

/**
 * Wrap raw HTML string into MS Word valid XHTML Mime-Type structure
 */
function convertHtmlToDocBlob(htmlContent, title) {
  const header = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; padding: 1in; color: #333333; }
        p { margin-bottom: 12pt; text-align: justify; }
        h1 { font-family: 'Century Gothic', 'Calibri', sans-serif; font-size: 22pt; margin-top: 24pt; margin-bottom: 12pt; color: #1e3a8a; font-weight: bold; }
        h2 { font-family: 'Century Gothic', 'Calibri', sans-serif; font-size: 16pt; margin-top: 18pt; margin-bottom: 8pt; color: #0f766e; font-weight: bold; }
        h3 { font-family: 'Century Gothic', 'Calibri', sans-serif; font-size: 13pt; margin-top: 14pt; margin-bottom: 6pt; color: #0284c7; font-weight: bold; }
      </style>
    </head>
    <body>
  `;
  const footer = `</body></html>`;
  const docContent = header + htmlContent + footer;
  return new Blob([docContent], { type: 'application/msword' });
}


// ==========================================
// 2. WORD TO PDF CONVERTER
// ==========================================
function setupWordToPdf() {
  const uploadZone = document.getElementById('word-upload-zone');
  const fileInput = document.getElementById('word-file-input');
  const fileInfo = document.getElementById('word-file-info');
  const actions = document.getElementById('word-actions');
  const removeBtn = document.getElementById('remove-word-btn');
  const convertBtn = document.getElementById('btn-convert-word');
  const spinner = document.getElementById('word-spinner');
  
  const editorCard = document.getElementById('document-editor-card');
  const richEditor = document.getElementById('rich-editor');
  const editorClearBtn = document.getElementById('editor-clear-btn');
  const downloadPdfBtn = document.getElementById('editor-download-pdf');

  // Drag and drop event listeners
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
      handleWordSelect(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleWordSelect(e.target.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetWordState();
  });

  convertBtn.addEventListener('click', async () => {
    if (!wordFile) return;
    
    convertBtn.disabled = true;
    spinner.classList.remove('hidden');
    
    try {
      const arrayBuffer = await readFileAsArrayBuffer(wordFile);
      
      // Mammoth converts DOCX to HTML
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      const html = result.value;
      const warnings = result.messages;
      
      if (warnings && warnings.length > 0) {
        console.warn('Mammoth warnings:', warnings);
      }
      
      // Populate Editor and reveal it
      richEditor.innerHTML = html;
      editorCard.classList.remove('hidden');
      
      // Smooth scroll to Editor
      editorCard.scrollIntoView({ behavior: 'smooth' });
      window.showToast('Document loaded successfully! Customize below.', 'success');
      
    } catch (error) {
      console.error(error);
      window.showToast('Failed to parse DOCX. Ensure it is a valid, uncorrupted file.', 'error');
    } finally {
      convertBtn.disabled = false;
      spinner.classList.add('hidden');
    }
  });

  // Editor specific buttons
  editorClearBtn.addEventListener('click', () => {
    richEditor.innerHTML = '<p><br></p>';
    window.showToast('Editor cleared', 'info');
  });

  downloadPdfBtn.addEventListener('click', () => {
    if (!richEditor.innerText.trim()) {
      window.showToast('Cannot export an empty document.', 'error');
      return;
    }
    
    downloadPdfBtn.disabled = true;
    const initialText = downloadPdfBtn.innerHTML;
    downloadPdfBtn.innerHTML = '<i class="fa-solid fa-spinner spinner-icon"></i> Generating...';
    
    // PDF Config
    const opt = {
      margin:       0.75, // 0.75 in margins
      filename:     wordFile ? wordFile.name.replace(/\.[^/.]+$/, '') + '.pdf' : 'document.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Save PDF
    html2pdf().set(opt).from(richEditor).save().then(() => {
      window.showToast('PDF downloaded successfully!', 'success');
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.innerHTML = initialText;
    }).catch(err => {
      console.error(err);
      window.showToast('Failed to export PDF.', 'error');
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.innerHTML = initialText;
    });
  });

  function handleWordSelect(file) {
    // Validate file type
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) {
      window.showToast('Please select a valid DOCX file.', 'error');
      return;
    }
    wordFile = file;
    
    // UI update
    uploadZone.querySelector('.upload-prompt').classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileInfo.querySelector('.file-name').textContent = file.name;
    fileInfo.querySelector('.file-size').textContent = window.formatBytes(file.size);
    actions.classList.remove('hidden');
    editorCard.classList.add('hidden');
  }

  function resetWordState() {
    wordFile = null;
    fileInput.value = '';
    uploadZone.querySelector('.upload-prompt').classList.remove('hidden');
    fileInfo.classList.add('hidden');
    actions.classList.add('hidden');
    editorCard.classList.add('hidden');
  }
}

// ==========================================
// 3. EDITOR FORMATTING TOOLBAR HELPERS
// ==========================================
function setupEditorToolbar() {
  const toolbarBtns = document.querySelectorAll('.toolbar-btn');
  
  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.getAttribute('data-command');
      
      // Execute document format command on selection
      document.execCommand(command, false, null);
      
      // Keep focus inside editor
      document.getElementById('rich-editor').focus();
    });
  });
}

// ==========================================
// 4. SHARED FILE READER HELPER
// ==========================================
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
