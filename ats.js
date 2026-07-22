/**
 * ScholarSync - Resume ATS Checker & Rejecter Detector Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAtsChecker();
});

function setupAtsChecker() {
  const uploadZone = document.getElementById('ats-upload-zone');
  const fileInput = document.getElementById('ats-file-input');
  const fileInfo = document.getElementById('ats-file-info');
  const removeFileBtn = document.getElementById('remove-ats-file-btn');
  
  const jobDescTextarea = document.getElementById('ats-job-desc');
  const textPasteTextarea = document.getElementById('ats-text-paste');
  
  const analyzeBtn = document.getElementById('btn-analyze-ats');
  
  const emptyReport = document.getElementById('ats-empty-report');
  const fullReport = document.getElementById('ats-full-report');
  
  const riskLevelEl = document.getElementById('ats-risk-level');
  const scorePctEl = document.getElementById('ats-score-pct');
  
  const statWordsEl = document.getElementById('ats-stat-words');
  const statFormatEl = document.getElementById('ats-stat-format');
  const statKeywordsEl = document.getElementById('ats-stat-keywords');
  
  const redFlagsUl = document.getElementById('ats-red-flags');
  const warningsUl = document.getElementById('ats-warnings');
  const passedUl = document.getElementById('ats-passed');

  let activeFile = null;
  let parsedResumeText = '';

  // Setup file drag/drop listeners
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileState();
  });

  // Handle selected file parsing
  async function handleFileSelect(file) {
    const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      window.showToast('Unsupported file type. Please upload a PDF or DOCX resume.', 'error');
      return;
    }

    activeFile = file;
    parsedResumeText = '';
    
    // UI update
    uploadZone.querySelector('.upload-prompt').classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileInfo.querySelector('.file-name').textContent = file.name;
    fileInfo.querySelector('.file-size').textContent = window.formatBytes(file.size);

    window.showToast('Extracting resume content locally...', 'info');

    try {
      if (isPdf) {
        parsedResumeText = await parsePdfText(file);
      } else if (isDocx) {
        parsedResumeText = await parseDocxText(file);
      }
      
      if (parsedResumeText.trim().length > 0) {
        window.showToast('Resume loaded! Click "Scan Resume" to analyze.', 'success');
        // Auto fill a preview in paste box to let them verify
        textPasteTextarea.value = parsedResumeText.slice(0, 1000) + '\n\n... [Content Extracted Successfully] ...';
      } else {
        window.showToast('Could not extract text. Check if file is scanned or empty.', 'warning');
      }
    } catch (error) {
      console.error(error);
      window.showToast('Error parsing file.', 'error');
    }
  }

  function resetFileState() {
    activeFile = null;
    parsedResumeText = '';
    fileInput.value = '';
    textPasteTextarea.value = '';
    uploadZone.querySelector('.upload-prompt').classList.remove('hidden');
    fileInfo.classList.add('hidden');
  }

  // Parse text from PDF file using PDF.js
  async function parsePdfText(file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  }

  // Parse text from DOCX file using Mammoth.js
  async function parseDocxText(file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    
    // Create temp DOM element to strip HTML tags safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = result.value;
    return tempDiv.innerText;
  }

  // Helper to read file as ArrayBuffer
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  // Trigger Resume Analysis
  analyzeBtn.addEventListener('click', () => {
    // If pasted text exists and file is empty, use pasted text
    let textToAnalyze = parsedResumeText;
    const pastedText = textPasteTextarea.value.trim();

    if (!activeFile && pastedText.length > 0) {
      textToAnalyze = pastedText;
    }

    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      window.showToast('Please upload a resume or paste text first.', 'error');
      return;
    }

    const jobDescription = jobDescTextarea.value.trim();
    runAtsAudit(textToAnalyze, jobDescription);
  });

  // Main Audit Algorithm
  function runAtsAudit(resumeText, jobDesc) {
    let score = 100;
    const redFlags = [];
    const warnings = [];
    const passed = [];

    const lowerText = resumeText.toLowerCase();

    // 1. Structure Check: Basic Sections
    const sections = {
      'Education': ['education', 'academic', 'university', 'college', 'school', 'degree'],
      'Experience': ['experience', 'work history', 'employment', 'professional background', 'career history'],
      'Skills': ['skills', 'technologies', 'proficiencies', 'expertise', 'technical skills', 'core competencies']
    };

    Object.keys(sections).forEach(sectionName => {
      const found = sections[sectionName].some(keyword => lowerText.includes(keyword));
      if (found) {
        passed.push(`**${sectionName} Section** found in resume structure.`);
      } else {
        score -= 15;
        redFlags.push(`**Missing ${sectionName} Section**: ATS parsers look for specific headings to categorize your details. Recruiters may reject resumes missing this.`);
      }
    });

    // 2. Formatting Check: Contact Info Check
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phonePattern = /\+?\d[\d -]{6,}\d/;
    const linkedinPattern = /linkedin\.com/;

    if (emailPattern.test(resumeText)) {
      passed.push('**Contact Email** detected.');
    } else {
      score -= 15;
      redFlags.push('**Missing Email Address**: Recruiters and ATS require an email to coordinate interviews. Ensure it is written clearly.');
    }

    if (phonePattern.test(resumeText)) {
      passed.push('**Phone Number** detected.');
    } else {
      score -= 10;
      redFlags.push('**Missing Phone Number**: Automated checkers flag profiles lacking phone contact details.');
    }

    if (linkedinPattern.test(lowerText)) {
      passed.push('**LinkedIn Profile URL** detected.');
    } else {
      score -= 5;
      warnings.push('**No LinkedIn URL found**: Modern employers look for online portfolio profiles. Add your LinkedIn handle.');
    }

    // 3. Word Count / Length Analysis
    const words = resumeText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    statWordsEl.textContent = wordCount;

    if (wordCount < 100) {
      score -= 20;
      redFlags.push('**Resume is too short**: Less than 100 words detected. ATS systems will auto-filter thin resumes.');
    } else if (wordCount > 1500) {
      score -= 8;
      warnings.push('**Resume is too long**: Word count exceeds 1500. Aim for a maximum of 1-2 structured pages (400-800 words is ideal).');
    } else {
      passed.push('**Optimal Length**: Word count is well-proportioned for standard screening.');
    }

    // 4. Buzzword Check (Overused clichés)
    const buzzwords = ['synergy', 'detail-oriented', 'go-getter', 'hardworking', 'team player', 'results-driven', 'think outside the box', 'self-starter', 'motivated', 'dynamic'];
    const foundBuzzwords = buzzwords.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return regex.test(lowerText);
    });

    if (foundBuzzwords.length > 0) {
      const penalty = Math.min(foundBuzzwords.length * 3, 10);
      score -= penalty;
      warnings.push(`**Contains generic buzzwords** (${foundBuzzwords.join(', ')}): ATS and recruiters dislike cliché summaries. Replace with actionable results.`);
    } else {
      passed.push('**No generic buzzwords detected**: Uses professional vocabulary.');
    }

    // 5. Strong Action Verbs vs Passive phrasing
    const actionVerbs = ['created', 'designed', 'optimized', 'developed', 'implemented', 'managed', 'led', 'engineered', 'formulated', 'calculated', 'launched', 'boosted', 'achieved', 'conducted'];
    const foundVerbs = actionVerbs.filter(verb => {
      const regex = new RegExp(`\\b${verb}\\b`, 'gi');
      return regex.test(lowerText);
    });

    if (foundVerbs.length < 3) {
      score -= 10;
      warnings.push('**Weak Action Verbs**: Few active descriptors found. Utilize strong verbs (e.g. "Optimized process by 10%") instead of passive words ("assisted with", "helped out").');
    } else {
      passed.push('**Action-Oriented Vocabulary**: Uses strong verb descriptions.');
    }

    // 6. Quantifiable Impact (Metrics)
    const hasNumbers = /\d+%|\$\d+|\b\d+\s*(percent|million|billion|users|customers|employees)\b/gi.test(lowerText);
    if (!hasNumbers) {
      score -= 10;
      warnings.push('**Missing Quantifiable Metrics**: No data highlights (percentages, cash amounts, scales) found. ATS prefers evidence of direct impact.');
    } else {
      passed.push('**Quantifiable Impact**: Found numbers/percentages that justify achievements.');
    }

    // 7. Job Description Keyword Matching
    let matchRatePct = '-';
    if (jobDesc && jobDesc.trim().length > 0) {
      const jdKeywords = extractKeywords(jobDesc);
      
      if (jdKeywords.length > 0) {
        const matched = jdKeywords.filter(keyword => lowerText.includes(keyword));
        const matchRate = (matched.length / jdKeywords.length) * 100;
        matchRatePct = `${Math.round(matchRate)}%`;

        if (matchRate < 35) {
          score -= 15;
          warnings.push(`**Low Job Keyword Match (${Math.round(matchRate)}%)**: Your resume is missing critical technical and job-specific words from the JD. Integrate them into your bullets.`);
        } else if (matchRate >= 65) {
          passed.push(`**Excellent Job Alignment (${Math.round(matchRate)}%)**: Great presence of matching job terms.`);
        } else {
          passed.push(`**Moderate Job Alignment (${Math.round(matchRate)}%)**: Contains some job-specific matching keywords.`);
        }
      }
    }
    statKeywordsEl.textContent = matchRatePct;

    // Compile Score
    score = Math.max(5, Math.min(100, score));
    scorePctEl.textContent = `${score}%`;

    // Visual Risk Indicator
    let riskLevel = 'Low Risk';
    riskLevelEl.className = ''; // Reset classes
    scorePctEl.className = '';
    
    if (score < 50) {
      riskLevel = 'High Risk of Rejection 🚫';
      riskLevelEl.style.color = 'var(--red)';
      scorePctEl.style.color = 'var(--red)';
    } else if (score < 80) {
      riskLevel = 'Medium Risk of Rejection ⚠️';
      riskLevelEl.style.color = '#f59e0b';
      scorePctEl.style.color = '#f59e0b';
    } else {
      riskLevel = 'Low Risk / High Match ✅';
      riskLevelEl.style.color = 'var(--green)';
      scorePctEl.style.color = 'var(--green)';
    }
    riskLevelEl.innerHTML = riskLevel;

    // Render bullet lists
    renderReportList(redFlagsUl, redFlags);
    renderReportList(warningsUl, warnings);
    renderReportList(passedUl, passed);

    // Reveal Report
    emptyReport.classList.add('hidden');
    fullReport.classList.remove('hidden');
    
    // Smooth scroll to report
    document.getElementById('ats-results-card').scrollIntoView({ behavior: 'smooth' });
    window.showToast('Scan complete! Check the audit report.', 'success');
  }

  function renderReportList(ulElement, itemsArray) {
    ulElement.innerHTML = '';
    if (itemsArray.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'None detected.';
      li.style.color = 'var(--text-muted)';
      ulElement.appendChild(li);
      return;
    }

    itemsArray.forEach(item => {
      const li = document.createElement('li');
      // Format markdown-like bold indicators
      li.innerHTML = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      ulElement.appendChild(li);
    });
  }

  // Keyword extraction algorithm (simple tf-idf inspired)
  function extractKeywords(text) {
    const stopWords = new Set([
      'the', 'and', 'or', 'to', 'for', 'in', 'on', 'at', 'with', 'a', 'an', 'is', 'are', 'of', 'this', 'that', 'we', 'our',
      'you', 'your', 'about', 'from', 'by', 'as', 'but', 'not', 'have', 'has', 'had', 'been', 'will', 'would', 'should',
      'can', 'could', 'about', 'some', 'any', 'each', 'all', 'any', 'their', 'them', 'these', 'those', 'must', 'into'
    ]);

    // Clean text: strip punctuation, lowercase
    const cleaned = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ');
    const tokens = cleaned.split(/\s+/);
    
    // Find terms with length >= 4, not stop words, and containing letters
    const wordCounts = {};
    tokens.forEach(token => {
      if (token.length >= 4 && !stopWords.has(token) && /^[a-z]+$/i.test(token)) {
        wordCounts[token] = (wordCounts[token] || 0) + 1;
      }
    });

    // Sort by count descending and take top 15 words
    const sorted = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
    return sorted.slice(0, 15);
  }
}
