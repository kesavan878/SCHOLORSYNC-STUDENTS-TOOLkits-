/**
 * ScholarSync - Student Productivity Tools Logic
 * Includes: GPA Calculator, Pomodoro Timer, Quick Notes, Task Planner
 */

document.addEventListener('DOMContentLoaded', () => {
  initGpaCalculator();
  initPomodoroTimer();
  initQuickNotes();
  initTaskPlanner();
});

// ==========================================
// 1. GPA CALCULATOR LOGIC
// ==========================================
function initGpaCalculator() {
  const tbody = document.getElementById('gpa-tbody');
  const addCourseBtn = document.getElementById('btn-add-course');
  const resetBtn = document.getElementById('btn-clear-gpa');
  const scoreDisplay = document.getElementById('gpa-score');
  const ratingDisplay = document.getElementById('gpa-rating');
  
  // Cumulative inputs
  const prevGpaInput = document.getElementById('prev-gpa');
  const prevCreditsInput = document.getElementById('prev-credits');
  const cumResultBox = document.getElementById('cum-result-box');
  const cumGpaVal = document.getElementById('cum-gpa-val');

  const gradePoints = {
    'A': 4.00, 'A-': 3.67, 'B+': 3.33, 'B': 3.00, 'B-': 2.67,
    'C+': 2.33, 'C': 2.00, 'C-': 1.67, 'D+': 1.33, 'D': 1.00, 'F': 0.00
  };

  // Add 3 default courses on load to guide the user
  for (let i = 0; i < 3; i++) {
    addCourseRow('', 3, 'A');
  }
  calculateGPA();

  addCourseBtn.addEventListener('click', () => {
    addCourseRow('', 3, 'A');
    calculateGPA();
  });

  resetBtn.addEventListener('click', () => {
    tbody.innerHTML = '';
    prevGpaInput.value = '';
    prevCreditsInput.value = '';
    cumResultBox.classList.add('hidden');
    addCourseRow('', 3, 'A');
    calculateGPA();
    window.showToast('GPA calculator reset', 'info');
  });

  // Listener for prior GPA changes
  [prevGpaInput, prevCreditsInput].forEach(input => {
    input.addEventListener('input', calculateGPA);
  });

  function addCourseRow(name = '', credits = 3, grade = 'A') {
    const tr = document.createElement('tr');
    
    // Course Name input
    const tdName = document.createElement('td');
    tdName.innerHTML = `<input type="text" class="custom-input" placeholder="e.g. Calculus I" value="${name}">`;
    
    // Credits input
    const tdCredits = document.createElement('td');
    tdCredits.innerHTML = `
      <select class="custom-select gpa-credits">
        <option value="1" ${credits === 1 ? 'selected' : ''}>1.0 Credit</option>
        <option value="2" ${credits === 2 ? 'selected' : ''}>2.0 Credits</option>
        <option value="3" ${credits === 3 ? 'selected' : ''}>3.0 Credits</option>
        <option value="4" ${credits === 4 ? 'selected' : ''}>4.0 Credits</option>
        <option value="5" ${credits === 5 ? 'selected' : ''}>5.0 Credits</option>
      </select>
    `;

    // Grade input
    const tdGrade = document.createElement('td');
    let gradeOptions = '';
    Object.keys(gradePoints).forEach(g => {
      gradeOptions += `<option value="${g}" ${grade === g ? 'selected' : ''}>${g} (${gradePoints[g].toFixed(2)})</option>`;
    });
    tdGrade.innerHTML = `<select class="custom-select gpa-grade">${gradeOptions}</select>`;

    // Action button
    const tdAction = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-row-btn';
    deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
    deleteBtn.addEventListener('click', () => {
      tr.remove();
      calculateGPA();
      window.showToast('Course removed', 'info');
    });
    tdAction.appendChild(deleteBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdCredits);
    tr.appendChild(tdGrade);
    tr.appendChild(tdAction);

    // Event listeners to recalculate on changes
    tr.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', calculateGPA);
    });
    tr.querySelector('input').addEventListener('input', calculateGPA);

    tbody.appendChild(tr);
  }

  function calculateGPA() {
    const rows = tbody.querySelectorAll('tr');
    let totalCredits = 0;
    let totalGradePoints = 0;

    rows.forEach(row => {
      const credits = parseFloat(row.querySelector('.gpa-credits').value);
      const gradeLetter = row.querySelector('.gpa-grade').value;
      const points = gradePoints[gradeLetter];

      totalCredits += credits;
      totalGradePoints += (points * credits);
    });

    let gpa = 0.00;
    if (totalCredits > 0) {
      gpa = totalGradePoints / totalCredits;
    }

    scoreDisplay.textContent = gpa.toFixed(2);
    updateRating(gpa);

    // Cumulative calculations
    const prevGpa = parseFloat(prevGpaInput.value);
    const prevCredits = parseFloat(prevCreditsInput.value);

    if (!isNaN(prevGpa) && !isNaN(prevCredits) && prevCredits > 0) {
      const overallCredits = prevCredits + totalCredits;
      const overallGpa = ((prevGpa * prevCredits) + (gpa * totalCredits)) / overallCredits;
      
      cumGpaVal.textContent = overallGpa.toFixed(2);
      cumResultBox.classList.remove('hidden');
    } else {
      cumResultBox.classList.add('hidden');
    }
  }

  function updateRating(gpa) {
    let rating = 'Enter course details';
    if (gpa >= 3.8) rating = '🎉 Dean\'s List Standing!';
    else if (gpa >= 3.5) rating = '💫 Excellent Standing';
    else if (gpa >= 3.0) rating = '✨ Good Standing';
    else if (gpa >= 2.0) rating = '👍 Satisfactory Standing';
    else if (gpa > 0.0) rating = '⚠️ Academic Warning';
    ratingDisplay.textContent = rating;
  }
}

// ==========================================
// 2. POMODORO TIMER LOGIC
// ==========================================
function initPomodoroTimer() {
  const timerText = document.getElementById('timer-time');
  const timerLabel = document.getElementById('timer-label');
  const progressBar = document.getElementById('timer-progress-bar');
  const playPauseBtn = document.getElementById('timer-play-pause');
  const resetBtn = document.getElementById('timer-reset');
  const skipBtn = document.getElementById('timer-skip');
  const ambientBg = document.getElementById('timer-ambient');
  
  // Controls
  const focusInput = document.getElementById('focus-duration');
  const shortBreakInput = document.getElementById('short-break-duration');
  const longBreakInput = document.getElementById('long-break-duration');
  
  // Mode switch buttons
  const modeBtns = document.querySelectorAll('.timer-mode-btn');

  // Stats
  const pomodoroCountDisplay = document.getElementById('pomodoro-count');
  const totalFocusTimeDisplay = document.getElementById('total-focus-time');
  
  let timerInterval = null;
  let timeRemaining = 25 * 60; // 25 minutes
  let currentMode = 'pomodoro'; // 'pomodoro', 'short-break', 'long-break'
  let isRunning = false;
  let totalTime = 25 * 60;
  
  // Track metrics in session
  let metrics = {
    pomodorosDone: parseInt(localStorage.getItem('edu-poms')) || 0,
    focusMinutes: parseInt(localStorage.getItem('edu-focus-m')) || 0
  };

  // Sync display on load
  updateStatsUI();
  resetTimer();

  // Play Pause Toggle
  playPauseBtn.addEventListener('click', toggleTimer);

  // Reset Button
  resetBtn.addEventListener('click', () => {
    resetTimer();
    window.showToast('Timer reset', 'info');
  });

  // Skip Button
  skipBtn.addEventListener('click', () => {
    skipSession();
  });

  // Mode buttons click listener
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedMode = btn.getAttribute('data-mode');
      
      // Update UI
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentMode = selectedMode;
      resetTimer();
    });
  });

  // Custom durations updates
  [focusInput, shortBreakInput, longBreakInput].forEach(input => {
    input.addEventListener('change', () => {
      // Validate input values
      if (input.value < 1) input.value = 1;
      resetTimer();
    });
  });

  function getModeDuration() {
    if (currentMode === 'pomodoro') return parseInt(focusInput.value) * 60;
    if (currentMode === 'short-break') return parseInt(shortBreakInput.value) * 60;
    if (currentMode === 'long-break') return parseInt(longBreakInput.value) * 60;
    return 25 * 60;
  }

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    isRunning = true;
    playPauseBtn.querySelector('#play-icon').classList.add('hidden');
    playPauseBtn.querySelector('#pause-icon').classList.remove('hidden');
    
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimeDisplay();
      updateCircularProgress();

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        onSessionComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    playPauseBtn.querySelector('#play-icon').classList.remove('hidden');
    playPauseBtn.querySelector('#pause-icon').classList.add('hidden');
    clearInterval(timerInterval);
  }

  function resetTimer() {
    pauseTimer();
    timeRemaining = getModeDuration();
    totalTime = timeRemaining;
    updateTimeDisplay();
    updateCircularProgress();
    updateAmbientColor();
    
    // Label
    if (currentMode === 'pomodoro') timerLabel.textContent = 'Stay Focused';
    else if (currentMode === 'short-break') timerLabel.textContent = 'Short Break';
    else if (currentMode === 'long-break') timerLabel.textContent = 'Relaxing Break';
  }

  function skipSession() {
    pauseTimer();
    window.showToast('Session skipped', 'info');
    // Rotate to next logical session
    if (currentMode === 'pomodoro') {
      currentMode = 'short-break';
    } else {
      currentMode = 'pomodoro';
    }
    
    // Update active tab buttons
    modeBtns.forEach(btn => {
      if (btn.getAttribute('data-mode') === currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    resetTimer();
  }

  function updateTimeDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateCircularProgress() {
    const circumference = 2 * Math.PI * 130; // Radius is 130, Circ is 816.8
    const offset = circumference * (1 - timeRemaining / totalTime);
    progressBar.style.strokeDashoffset = offset;
  }

  function updateAmbientColor() {
    let colorGlow = 'rgba(99, 102, 241, 0.15)'; // Indigo for Pomodoro
    let strokeColor = 'var(--primary)';
    
    if (currentMode === 'short-break') {
      colorGlow = 'rgba(34, 197, 94, 0.15)'; // Green for short break
      strokeColor = 'var(--green)';
    } else if (currentMode === 'long-break') {
      colorGlow = 'rgba(14, 165, 233, 0.15)'; // Blue for long break
      strokeColor = 'var(--blue)';
    }
    
    ambientBg.style.background = `radial-gradient(circle, ${colorGlow} 0%, rgba(0,0,0,0) 70%)`;
    progressBar.style.stroke = strokeColor;
  }

  function onSessionComplete() {
    // Play sound notification
    try {
      const bell = document.getElementById('bell-sound');
      bell.currentTime = 0;
      bell.play();
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }

    if (currentMode === 'pomodoro') {
      metrics.pomodorosDone++;
      const sessionMinutes = parseInt(focusInput.value);
      metrics.focusMinutes += sessionMinutes;
      
      // Save stats
      localStorage.setItem('edu-poms', metrics.pomodorosDone);
      localStorage.setItem('edu-focus-m', metrics.focusMinutes);
      
      updateStatsUI();
      window.showToast('Great job! Time for a short break.', 'success');
      currentMode = 'short-break';
    } else {
      window.showToast('Break finished! Ready to work?', 'success');
      currentMode = 'pomodoro';
    }

    // Toggle active layout button
    modeBtns.forEach(btn => {
      if (btn.getAttribute('data-mode') === currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    resetTimer();
  }

  function updateStatsUI() {
    pomodoroCountDisplay.textContent = metrics.pomodorosDone;
    totalFocusTimeDisplay.textContent = `${metrics.focusMinutes}m`;
  }
}

// ==========================================
// 3. QUICK NOTES LOGIC
// ==========================================
function initQuickNotes() {
  const notesList = document.getElementById('notes-list-items');
  const addNoteBtn = document.getElementById('btn-add-note');
  const searchInput = document.getElementById('notes-search');
  
  const noteTitleInput = document.getElementById('note-title-input');
  const noteTextarea = document.getElementById('note-textarea');
  const notePreviewDiv = document.getElementById('note-preview');
  
  const previewToggleBtn = document.getElementById('btn-preview-note');
  const downloadNoteBtn = document.getElementById('btn-download-note');
  const deleteNoteBtn = document.getElementById('btn-delete-note');

  let notes = JSON.parse(localStorage.getItem('edu-notes')) || [
    {
      id: 'note-1',
      title: 'Chemistry Exam Prep',
      content: '# Chemistry Exam Study Guide\n\n- Focus on Periodic Trends\n- Electronegativity increases across a period\n- Atomic radius increases down a group\n\n### Formulas to memorize:\n- PV = nRT (Ideal Gas Law)\n- Molarity = moles / liters',
      updatedAt: new Date().toLocaleDateString()
    },
    {
      id: 'note-2',
      title: 'Syllabus Deadlines',
      content: '# Final Essay Project\n\n- Due Date: August 15, 2026\n- Words target: 2000 words\n- Format: APA Style PDF',
      updatedAt: new Date().toLocaleDateString()
    }
  ];

  let activeNoteId = notes.length > 0 ? notes[0].id : null;
  let previewMode = false;

  renderNotesList();
  loadActiveNote();

  addNoteBtn.addEventListener('click', () => {
    const newNote = {
      id: 'note-' + Date.now(),
      title: 'New Study Note',
      content: '',
      updatedAt: new Date().toLocaleDateString()
    };
    notes.unshift(newNote);
    activeNoteId = newNote.id;
    saveNotes();
    renderNotesList();
    loadActiveNote();
    window.showToast('New note created', 'success');
  });

  // Note edits auto-save
  [noteTitleInput, noteTextarea].forEach(input => {
    input.addEventListener('input', () => {
      if (!activeNoteId) return;
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        note.title = noteTitleInput.value || 'Untitled Note';
        note.content = noteTextarea.value;
        note.updatedAt = new Date().toLocaleDateString();
        saveNotes();
        
        // Update title in sidebar on-the-fly
        const sidebarItem = document.querySelector(`.note-item[data-id="${activeNoteId}"] .note-item-title`);
        if (sidebarItem) sidebarItem.textContent = note.title;
      }
    });
  });

  // Search filter
  searchInput.addEventListener('input', () => {
    renderNotesList();
  });

  // Toggle Markdown Preview
  previewToggleBtn.addEventListener('click', () => {
    previewMode = !previewMode;
    if (previewMode) {
      // Parse markdown to HTML
      const htmlContent = parseMarkdown(noteTextarea.value);
      notePreviewDiv.innerHTML = htmlContent || '<p style="color:var(--text-muted)">Nothing to preview.</p>';
      noteTextarea.classList.add('hidden');
      notePreviewDiv.classList.remove('hidden');
      previewToggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i> <span>Write</span>';
    } else {
      noteTextarea.classList.remove('hidden');
      notePreviewDiv.classList.add('hidden');
      previewToggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i> <span>Preview</span>';
    }
  });

  // Download Notes
  downloadNoteBtn.addEventListener('click', () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNote.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.showToast('Note exported as markdown!', 'success');
  });

  // Delete Note
  deleteNoteBtn.addEventListener('click', () => {
    if (!activeNoteId) return;
    if (confirm('Are you sure you want to delete this note?')) {
      notes = notes.filter(n => n.id !== activeNoteId);
      activeNoteId = notes.length > 0 ? notes[0].id : null;
      saveNotes();
      renderNotesList();
      loadActiveNote();
      window.showToast('Note deleted', 'error');
    }
  });

  function renderNotesList() {
    const searchQuery = searchInput.value.toLowerCase();
    notesList.innerHTML = '';

    const filteredNotes = notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery) || 
      n.content.toLowerCase().includes(searchQuery)
    );

    if (filteredNotes.length === 0) {
      notesList.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 2rem 0;">No notes found</div>';
      return;
    }

    filteredNotes.forEach(note => {
      const item = document.createElement('div');
      item.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
      item.setAttribute('data-id', note.id);
      item.innerHTML = `
        <div class="note-item-title">${note.title}</div>
        <div class="note-item-date">${note.updatedAt}</div>
      `;
      
      item.addEventListener('click', () => {
        activeNoteId = note.id;
        // Turn off preview when switching notes
        if (previewMode) {
          previewMode = false;
          noteTextarea.classList.remove('hidden');
          notePreviewDiv.classList.add('hidden');
          previewToggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i> <span>Preview</span>';
        }
        
        // Set active item class
        document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        
        loadActiveNote();
      });

      notesList.appendChild(item);
    });
  }

  function loadActiveNote() {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      noteTitleInput.value = activeNote.title;
      noteTextarea.value = activeNote.content;
      
      noteTitleInput.disabled = false;
      noteTextarea.disabled = false;
      previewToggleBtn.disabled = false;
      downloadNoteBtn.disabled = false;
      deleteNoteBtn.disabled = false;
    } else {
      noteTitleInput.value = '';
      noteTextarea.value = '';
      noteTitleInput.placeholder = 'Click "+" to create a note';
      
      noteTitleInput.disabled = true;
      noteTextarea.disabled = true;
      previewToggleBtn.disabled = true;
      downloadNoteBtn.disabled = true;
      deleteNoteBtn.disabled = true;
    }
  }

  function saveNotes() {
    localStorage.setItem('edu-notes', JSON.stringify(notes));
  }

  /**
   * Simple client-side Markdown parser (Regex-based)
   */
  function parseMarkdown(markdown) {
    if (!markdown) return '';
    let html = markdown
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/`(.*)`/gim, '<code>$1</code>')
      // Bullet list items
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Paragraph spacing
      .replace(/\n$/gim, '<br />')
      .replace(/\n\n/gim, '</p><p>');

    // Wrap list elements inside tags
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    return `<p>${html}</p>`;
  }
}

// ==========================================
// 4. TASK PLANNER LOGIC
// ==========================================
function initTaskPlanner() {
  const form = document.getElementById('task-form');
  const tasksUl = document.getElementById('tasks-ul');
  const emptyState = document.getElementById('tasks-empty-state');
  
  const titleInput = document.getElementById('task-title');
  const categorySelect = document.getElementById('task-category');
  const prioritySelect = document.getElementById('task-priority');
  const deadlineInput = document.getElementById('task-deadline');
  
  const filterBtns = document.querySelectorAll('.filter-btn');

  let tasks = JSON.parse(localStorage.getItem('edu-tasks')) || [
    {
      id: 'task-1',
      title: 'Research Essay draft submission',
      category: 'Assignment',
      priority: 'High',
      deadline: '2026-07-10',
      completed: false
    },
    {
      id: 'task-2',
      title: 'Physics Chapter 4 Quiz',
      category: 'Exam',
      priority: 'Medium',
      deadline: '2026-07-02',
      completed: true
    }
  ];

  let currentFilter = 'all';

  renderTasks();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newTask = {
      id: 'task-' + Date.now(),
      title: titleInput.value,
      category: categorySelect.value,
      priority: prioritySelect.value,
      deadline: deadlineInput.value,
      completed: false
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    
    // Reset form
    titleInput.value = '';
    deadlineInput.value = '';
    window.showToast('Task added to planner', 'success');
  });

  // Filter actions
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderTasks();
    });
  });

  function renderTasks() {
    tasksUl.innerHTML = '';
    
    let filtered = tasks;
    if (currentFilter === 'active') {
      filtered = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
      filtered = tasks.filter(t => t.completed);
    }

    // Sort tasks: Active first, high priority first, then date sorted
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const priorities = { 'High': 3, 'Medium': 2, 'Low': 1 };
      if (priorities[a.priority] !== priorities[b.priority]) {
        return priorities[b.priority] - priorities[a.priority];
      }
      return new Date(a.deadline) - new Date(b.deadline);
    });

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      // Calculate display date format
      const deadlineDate = new Date(task.deadline);
      const displayDate = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Setup priority badge class
      let priorityClass = 'priority-low';
      if (task.priority === 'High') priorityClass = 'priority-high';
      if (task.priority === 'Medium') priorityClass = 'priority-medium';

      li.innerHTML = `
        <div class="task-item-left">
          <div class="task-checkbox-container">
            <div class="task-checkbox-custom">
              <i class="fa-solid fa-check"></i>
            </div>
          </div>
          <div class="task-details">
            <span class="task-title-text">${task.title}</span>
            <div class="task-meta-row">
              <span class="task-category-tag">${task.category}</span>
              <span class="task-priority-indicator ${priorityClass}">${task.priority}</span>
              <span class="task-deadline-tag">
                <i class="fa-regular fa-calendar-days"></i>
                <span>${displayDate}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="task-item-right">
          <button class="delete-row-btn btn-delete-task" title="Delete Task">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      // Checkbox click event
      li.querySelector('.task-checkbox-container').addEventListener('click', () => {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        window.showToast(task.completed ? 'Task completed! Keep it up!' : 'Task set to active', 'success');
      });

      // Delete button event
      li.querySelector('.btn-delete-task').addEventListener('click', (e) => {
        e.stopPropagation();
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
        window.showToast('Task removed', 'error');
      });

      tasksUl.appendChild(li);
    });
  }

  function saveTasks() {
    localStorage.setItem('edu-tasks', JSON.stringify(tasks));
  }
}
