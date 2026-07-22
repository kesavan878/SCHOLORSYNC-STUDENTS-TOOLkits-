/**
 * ScholarSync - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerServiceWorker();
});

// App State
const state = {
  theme: localStorage.getItem('edu-theme') || 'light',
  currentTab: 'pdf-word',
};

// Elements
const elements = {
  themeToggleBtn: document.getElementById('theme-toggle'),
  menuItems: document.querySelectorAll('.menu-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  tabTitle: document.getElementById('current-tab-title'),
  tabDesc: document.getElementById('current-tab-desc'),
  liveDate: document.getElementById('live-date'),
  toastContainer: document.getElementById('toast-container'),
};

// Title and Subtitles mapping for Tabs
const tabMeta = {
  'pdf-word': {
    title: 'PDF &leftrightarrow; Word Converter',
    desc: 'Convert document files locally in your browser with full privacy'
  },
  'ats-checker': {
    title: 'Resume ATS Checker & Rejecter Detector',
    desc: 'Scan your resume for formatting, contact, and structural issues that trigger automatic rejection'
  },
  'simplifier': {
    title: 'Simple English Translator & Simplifier',
    desc: 'Translate complex paragraphs and vocabulary-heavy sentences into plain, easy-to-understand English.'
  },
  'compressor': {
    title: 'Photo Compressor',
    desc: 'Optimize image file sizes before uploading to university portals'
  },
  'pptx': {
    title: 'Photos to PowerPoint Converter',
    desc: 'Create and configure slides from images and compile them into PPTX format'
  },
  'gpa': {
    title: 'GPA Calculator',
    desc: 'Calculate Semester & Cumulative GPA using credit-weight averages.'
  },
  'timer': {
    title: 'Study Focus Timer',
    desc: 'Maximize study productivity using structured Pomodoro focus cycles.'
  },
  'notes': {
    title: 'Quick Notes & Scribbles',
    desc: 'Jot down thoughts, ideas, or markdown notes saved automatically.'
  },
  'tasks': {
    title: 'Student Task Planner',
    desc: 'Schedule homework, exams, and projects to keep track of your syllabus.'
  }
};

/**
 * Initialize core application systems
 */
function initApp() {
  setupTheme();
  setupNavigation();
  updateLiveDate();
  
  // Set initial page title
  updateTitle(state.currentTab);
  
  // Toast notifications trigger on load
  showToast('Welcome to ScholarSync! Ready to study?', 'info');
}

/**
 * Handle Light/Dark Theme Switching
 */
function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeUI();

  elements.themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('edu-theme', state.theme);
    updateThemeUI();
    showToast(`Switched to ${state.theme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  });
}

function updateThemeUI() {
  const themeText = elements.themeToggleBtn.querySelector('.theme-text');
  if (state.theme === 'dark') {
    themeText.textContent = 'Dark Mode';
  } else {
    themeText.textContent = 'Light Mode';
  }
}

/**
 * Single-Page Router / Tab Switcher
 */
function setupNavigation() {
  elements.menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  if (state.currentTab === tabId) return;
  
  // Update Active Link in Sidebar
  elements.menuItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Switch visible sections
  elements.tabContents.forEach(section => {
    const secId = section.getAttribute('id');
    if (secId === `tab-${tabId}`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  state.currentTab = tabId;
  updateTitle(tabId);
}

function updateTitle(tabId) {
  const meta = tabMeta[tabId];
  if (meta) {
    elements.tabTitle.innerHTML = meta.title;
    elements.tabDesc.textContent = meta.desc;
  }
}

/**
 * Date / Calendar widget updates
 */
function updateLiveDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  elements.liveDate.textContent = today.toLocaleDateString('en-US', options);
}

/**
 * Application Toast Notifications Center
 * @param {string} message - Text message to show
 * @param {string} type - 'success', 'error', 'info'
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  if (type === 'info') iconClass = 'fa-circle-info';
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Slide out and remove toast after 4s
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

/**
 * Helper: Format File Sizes
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Export functions to global scope so other scripts can access them
window.showToast = showToast;
window.formatBytes = formatBytes;

/**
 * Register Service Worker for PWA Offline Support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}
