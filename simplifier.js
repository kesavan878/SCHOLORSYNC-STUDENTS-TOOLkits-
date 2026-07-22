/**
 * ScholarSync - Simple English Translator & Simplifier Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  setupSimplifier();
});

function setupSimplifier() {
  const inputArea = document.getElementById('simplifier-input');
  
  const sampleAbstractBtn = document.getElementById('btn-load-sample-abstract');
  const samplePromptBtn = document.getElementById('btn-load-sample-prompt');
  const translateBtn = document.getElementById('btn-translate-simple');
  
  const emptyState = document.getElementById('simplifier-empty-state');
  const resultsDiv = document.getElementById('simplifier-results');
  
  const difficultyEl = document.getElementById('simplifier-difficulty');
  const scoreEl = document.getElementById('simplifier-score');
  const outputTextEl = document.getElementById('simplifier-output-text');
  const bulletsUl = document.getElementById('simplifier-bullets');
  const vocabTbody = document.getElementById('simplifier-vocab-tbody');

  // Complex to Simple Vocabulary Dictionary (50 Common Academic/Business terms)
  const vocabDict = {
    'utilize': 'use',
    'utilised': 'used',
    'utilization': 'use',
    'facilitate': 'help / make easy',
    'facilitated': 'helped / made easy',
    'facilitates': 'helps / makes easy',
    'demonstrate': 'show / prove',
    'demonstrated': 'showed / proved',
    'demonstrates': 'shows / proves',
    'subsequent': 'next / later',
    'subsequently': 'later / next',
    'consequently': 'so / as a result',
    'nevertheless': 'but / however',
    'furthermore': 'also / in addition',
    'terminate': 'end / stop',
    'terminated': 'ended / stopped',
    'commence': 'start / begin',
    'commenced': 'started / begun',
    'implement': 'carry out / start',
    'implemented': 'carried out / started',
    'concerning': 'about',
    'additional': 'more',
    'advantageous': 'helpful / good',
    'appropriate': 'proper / right',
    'assistance': 'help',
    'attempt': 'try',
    'attempted': 'tried',
    'cognizant': 'aware',
    'disseminate': 'spread / share',
    'disseminated': 'shared / spread',
    'endeavor': 'try / effort',
    'equivalent': 'same / equal',
    'erroneous': 'wrong / mistaken',
    'expedite': 'speed up',
    'fundamental': 'basic',
    'inception': 'start',
    'initiate': 'start',
    'initiated': 'started',
    'magnitude': 'size',
    'modification': 'change',
    'modify': 'change',
    'modified': 'changed',
    'numerous': 'many',
    'objective': 'goal',
    'optimum': 'best',
    'optimal': 'best',
    'parameters': 'rules / limits',
    'preclude': 'prevent / block',
    'requisite': 'needed / required',
    'scrutinize': 'examine / check',
    'substantial': 'large / big',
    'transpire': 'happen / take place',
    'unilateral': 'one-sided',
    'viable': 'workable / usable',
    'validate': 'check / prove',
    'validated': 'checked / proved'
  };

  // Sample texts
  const sampleAbstract = `The utilization of advanced methodology is requisite to facilitate the optimization of learning outcomes. Consequently, researchers must endeavor to initiate a substantial modification of traditional educational parameters. Subsequent investigations will scrutinize the magnitude of these adjustments, concerning whether they preclude student dropouts or demonstrate erroneous patterns. Furthermore, it is fundamental that educators remain cognizant of optimum strategies to expedite syllabus comprehension.`;

  const samplePrompt = `In order to commence work on your final assignment submission, it is appropriate that you first attempt to scrutinize numerous historical sources to validate your core thesis statement. Furthermore, you must implement proper formatting rules, and nevertheless, if you require additional assistance, you are advised to contact the tutor before the termination of the weekly office hours. Subsequent submissions will not be accepted under any parameters.`;

  // Event listeners for sample loaders
  sampleAbstractBtn.addEventListener('click', () => {
    inputArea.value = sampleAbstract;
    window.showToast('Sample academic abstract loaded.', 'info');
  });

  samplePromptBtn.addEventListener('click', () => {
    inputArea.value = samplePrompt;
    window.showToast('Sample complex assignment prompt loaded.', 'info');
  });

  // Action trigger
  translateBtn.addEventListener('click', () => {
    const rawText = inputArea.value.trim();
    if (rawText.length === 0) {
      window.showToast('Please paste or load some English text first.', 'error');
      return;
    }

    translateBtn.disabled = true;
    const originalText = translateBtn.innerHTML;
    translateBtn.innerHTML = '<i class="fa-solid fa-spinner spinner-icon"></i> Translating...';

    // Simulate small delay for magic effect
    setTimeout(() => {
      processTranslation(rawText);
      translateBtn.disabled = false;
      translateBtn.innerHTML = originalText;
    }, 600);
  });

  // Main translation function
  function processTranslation(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Split sentences using regex
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length || 1;

    // Count syllables
    let totalSyllables = 0;
    words.forEach(word => {
      totalSyllables += countSyllables(word);
    });

    // Flesch Reading Ease approximation
    // Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const asl = wordCount / sentenceCount; // Average sentence length
    const asw = totalSyllables / wordCount; // Average syllables per word
    let score = Math.round(206.835 - (1.015 * asl) - (84.6 * asw));
    
    // Boundary check
    score = Math.max(0, Math.min(100, score));

    // Determine difficulty rating
    let difficulty = 'Very Easy';
    let difficultyColor = 'var(--green)';
    
    if (score < 30) {
      difficulty = 'Very Hard / Academic (Graduate level)';
      difficultyColor = 'var(--red)';
    } else if (score < 50) {
      difficulty = 'Difficult / Advanced (College level)';
      difficultyColor = '#f59e0b';
    } else if (score < 70) {
      difficulty = 'Moderate (High School level)';
      difficultyColor = 'var(--primary)';
    } else if (score < 90) {
      difficulty = 'Easy / Readable (Middle School level)';
      difficultyColor = 'var(--green)';
    } else {
      difficulty = 'Very Simple English';
      difficultyColor = 'var(--green)';
    }

    difficultyEl.textContent = difficulty;
    difficultyEl.style.color = difficultyColor;
    scoreEl.textContent = `${score} / 100`;
    scoreEl.style.color = difficultyColor;

    // Translation logic:
    const simplifiedSentences = [];
    const usedVocab = {};

    sentences.forEach(sentence => {
      let tempSentence = sentence;
      
      // Look up complex words and replace them
      Object.keys(vocabDict).forEach(complexWord => {
        // Match word boundaries case insensitively
        const regex = new RegExp(`\\b${complexWord}\\b`, 'gi');
        if (regex.test(tempSentence)) {
          usedVocab[complexWord.toLowerCase()] = vocabDict[complexWord];
          tempSentence = tempSentence.replace(regex, `<strong>${vocabDict[complexWord]}</strong>`);
        }
      });

      // Sentence splitting: if sentence is too long (> 20 words), split it at conjunctions (and, but, which)
      const sentenceWords = tempSentence.split(' ');
      if (sentenceWords.length > 20) {
        // Find conjunction
        const splitIndex = sentenceWords.findIndex((w, i) => i > 6 && i < sentenceWords.length - 6 && (w.toLowerCase() === 'and' || w.toLowerCase() === 'but' || w.toLowerCase() === 'whereas' || w.toLowerCase() === 'while'));
        if (splitIndex !== -1) {
          const part1 = sentenceWords.slice(0, splitIndex).join(' ') + '.';
          const part2 = sentenceWords.slice(splitIndex + 1).join(' ');
          // Capitalize second part
          const capitalizedPart2 = part2.charAt(0).toUpperCase() + part2.slice(1);
          simplifiedSentences.push(part1);
          simplifiedSentences.push(capitalizedPart2);
          return;
        }
      }

      simplifiedSentences.push(tempSentence);
    });

    // Populate Plain English text area
    outputTextEl.innerHTML = simplifiedSentences.join(' ');

    // Populate Decoded Vocabulary Table
    vocabTbody.innerHTML = '';
    const complexWordsFound = Object.keys(usedVocab);
    
    if (complexWordsFound.length === 0) {
      vocabTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No highly complex words detected.</td></tr>`;
    } else {
      complexWordsFound.forEach(complex => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="color: var(--red);">${complex}</strong></td>
          <td><strong style="color: var(--green);">${usedVocab[complex]}</strong></td>
        `;
        vocabTbody.appendChild(tr);
      });
    }

    // Populate Key Points Bullets (Short Summary of 2-3 key simplified sentences)
    bulletsUl.innerHTML = '';
    // Select first and last sentences, plus the longest middle sentence
    const summarySentences = [];
    if (simplifiedSentences.length > 0) {
      summarySentences.push(simplifiedSentences[0]);
    }
    if (simplifiedSentences.length > 2) {
      // Find longest in middle
      let longest = simplifiedSentences[1];
      for (let idx = 1; idx < simplifiedSentences.length - 1; idx++) {
        if (simplifiedSentences[idx].length > longest.length) {
          longest = simplifiedSentences[idx];
        }
      }
      summarySentences.push(longest);
    }
    if (simplifiedSentences.length > 1) {
      summarySentences.push(simplifiedSentences[simplifiedSentences.length - 1]);
    }

    // Deduplicate and strip html strong tags for bullets
    const cleanBullets = [...new Set(summarySentences)].map(s => s.replace(/<\/?strong>/g, ''));
    cleanBullets.forEach(bullet => {
      const li = document.createElement('li');
      li.textContent = bullet;
      bulletsUl.appendChild(li);
    });

    // Show panel
    emptyState.classList.add('hidden');
    resultsDiv.classList.remove('hidden');

    document.getElementById('simplifier-results-card').scrollIntoView({ behavior: 'smooth' });
    window.showToast('Text simplified successfully!', 'success');
  }

  // Syllable Counter Heuristic (Vowels grouping check)
  function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    // Strip trailing silent letters (es, ed, e)
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    // Strip leading y
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}
