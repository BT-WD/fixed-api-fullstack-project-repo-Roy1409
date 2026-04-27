let baseurl = 'https://opentdb.com/api.php?';
const categorySelect = document.getElementById('category');
const difficultySelect = document.getElementById('difficulty');
const typeSelect = document.getElementById('type');
const amountSelect = document.getElementById('amount');
const output = document.getElementById('output');
let finalurl = "";
function buildFinalUrl() {
    const amount = amountSelect?.value || '10';
    const category = categorySelect?.value || 'any';
    const difficulty = difficultySelect?.value || 'any';
    const type = typeSelect?.value || 'multiple';
    const params = [`amount=${encodeURIComponent(amount)}`];
    if (category !== 'any') params.push(`category=${encodeURIComponent(category)}`);
    if (difficulty !== 'any') params.push(`difficulty=${encodeURIComponent(difficulty)}`);
    if (type && type !== 'any') params.push(`type=${encodeURIComponent(type)}`);
    finalurl = baseurl + params.join('&');
    return finalurl;
}
function decodeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
}
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
let questionsData = [];
let currentIndex = 0;
let score = 0;
const HIGH_SCORE_KEY = 'triviaHighScore';
function getHighScoreEntry() {
    const json = localStorage.getItem(HIGH_SCORE_KEY);
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}
function saveHighScoreEntry(entry) {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(entry));
}
function updateHighScoreDisplay() {
    const highScoreValue = document.getElementById('high-score-value');
    const stored = getHighScoreEntry();
    if (!highScoreValue) return;
    if (!stored) {
        highScoreValue.textContent = 'No score yet';
        return;
    }
    highScoreValue.textContent = `${stored.score}/${stored.total} (${stored.percent}%)`;
}
function initializeHighScore() {
    updateHighScoreDisplay();
}
function makeSaveHighScoreButton(total) {
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.id = 'save-high-score';
    saveButton.textContent = 'Save High Score';
    const info = document.createElement('p');
    info.className = 'save-info';
    saveButton.addEventListener('click', () => {
        const percent = Math.round((score / total) * 100);
        const currentEntry = { score, total, percent };
        const stored = getHighScoreEntry();
        const shouldUpdate = !stored || percent > stored.percent || (percent === stored.percent && score > stored.score);
        if (shouldUpdate) {
            saveHighScoreEntry(currentEntry);
            updateHighScoreDisplay();
            saveButton.textContent = 'Saved!';
            saveButton.disabled = true;
            info.textContent = 'High score saved locally.';
        } else {
            info.textContent = 'Current result is not higher than saved high score.';
        }
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'save-high-score-container';
    wrapper.appendChild(saveButton);
    wrapper.appendChild(info);
    return wrapper;
}
function renderQuestionAt(index) {
    if (!output) return;
    output.innerHTML = '';

    if (index >= questionsData.length) {
        showResults();
        return;
    }
    const q = questionsData[index];
    const container = document.createElement('div');
    container.className = 'question';
    const qText = document.createElement('h3');
    qText.textContent = `${index + 1}. ${decodeHtml(q.question)}`;
    container.appendChild(qText);
    const answers = [
        ...q.incorrect_answers.map(a => ({ text: decodeHtml(a), correct: false })),
        { text: decodeHtml(q.correct_answer), correct: true }
    ];
    shuffle(answers);
    const list = document.createElement('div');
    list.className = 'answers';
    answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer-btn';
        btn.textContent = ans.text;
        btn.addEventListener('click', () => {
            if (btn.dataset.answered) return;
            btn.dataset.answered = 'true';
            list.querySelectorAll('button').forEach(b => b.disabled = true);
            if (ans.correct) {
                btn.style.background = '#4caf50';
                btn.style.color = '#fff';
                score++;
            } else {
                btn.style.background = '#f44336';
                btn.style.color = '#fff';
                const correctBtn = Array.from(list.querySelectorAll('button')).find(b => b.textContent === decodeHtml(q.correct_answer));
                if (correctBtn) {
                    correctBtn.style.background = '#4caf50';
                    correctBtn.style.color = '#fff';
                }
            }
            setTimeout(() => {
                currentIndex++;
                renderQuestionAt(currentIndex);
            }, 700);
        });
        list.appendChild(btn);
    });
    container.appendChild(list);
    output.appendChild(container);
}
function renderQuestions(questions) {
    questionsData = Array.isArray(questions) ? questions : [];
    currentIndex = 0;
    score = 0;
    if (!output) return;
    if (questionsData.length === 0) {
        output.innerHTML = '<p>No questions returned.</p>';
        return;
    }
    renderQuestionAt(0);
}
function showResults() {
    if (!output) return;
    const total = questionsData.length || 1;
    const percent = Math.round((score / total) * 100);
    output.innerHTML = '';
    const results = document.createElement('div');
    results.className = 'results';
    const h = document.createElement('h3');
    h.textContent = 'Results';
    const pScore = document.createElement('p');
    pScore.textContent = `You answered ${score} of ${total} correctly.`;
    const pPercent = document.createElement('p');
    pPercent.textContent = `Score: ${percent}%`;
    const saveButtonWrapper = makeSaveHighScoreButton(total);
    const playAgain = document.createElement('button');
    playAgain.type = 'button';
    playAgain.id = 'play-again';
    playAgain.textContent = 'Play Again';
    playAgain.addEventListener('click', () => {
        document.getElementById('start')?.click();
    });
    results.appendChild(h);
    results.appendChild(pScore);
    results.appendChild(pPercent);
    results.appendChild(saveButtonWrapper);
    results.appendChild(playAgain);
    output.appendChild(results);
}
document.getElementById('start')?.addEventListener('click', () => {
    const url = buildFinalUrl();
    if (output) output.innerHTML = '<p>Loading...</p>';
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data?.response_code === 0 && Array.isArray(data.results)) {
                renderQuestions(data.results);
            } else {
                if (output) output.innerHTML = `<p>No questions available (response_code: ${data?.response_code}).</p>`;
            }
        })
        .catch(error => {
            console.error('Error fetching API:', error);
            if (output) output.innerHTML = '<p>Error fetching questions. See console for details.</p>';
        });
});

initializeHighScore();

