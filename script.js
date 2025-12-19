let allQuestions = [];
let currentQuiz = [];

// Load questions from global variable
if (typeof QUESTION_DATA !== 'undefined') {
    allQuestions = QUESTION_DATA;
    initApp();
} else {
    console.error('Failed to load questions: QUESTION_DATA is undefined');
    alert('题库加载失败，请检查 questions.js 是否存在');
}

function initApp() {
    // Count question types
    const counts = {
        '单选题': 0,
        '多选题': 0,
        '判断题': 0,
        '填空题': 0
    };

    allQuestions.forEach(q => {
        if (counts[q.type] !== undefined) {
            counts[q.type]++;
        }
    });

    // Update UI counts
    document.getElementById('total-single').textContent = counts['单选题'];
    document.getElementById('total-multiple').textContent = counts['多选题'];
    document.getElementById('total-judge').textContent = counts['判断题'];
    document.getElementById('total-fill').textContent = counts['填空题'];

    // Set max values for inputs
    document.getElementById('num-single').max = counts['单选题'];
    document.getElementById('num-multiple').max = counts['多选题'];
    document.getElementById('num-judge').max = counts['判断题'];
    document.getElementById('num-fill').max = counts['填空题'];

    // Event Listeners
    document.getElementById('start-btn').addEventListener('click', startQuiz);
    document.getElementById('submit-btn').addEventListener('click', submitQuiz);
    document.getElementById('restart-btn').addEventListener('click', restartApp);
}

function startQuiz() {
    const numSingle = parseInt(document.getElementById('num-single').value) || 0;
    const numMultiple = parseInt(document.getElementById('num-multiple').value) || 0;
    const numJudge = parseInt(document.getElementById('num-judge').value) || 0;
    const numFill = parseInt(document.getElementById('num-fill').value) || 0;

    const singleQs = getRandomQuestions('单选题', numSingle);
    const multipleQs = getRandomQuestions('多选题', numMultiple);
    const judgeQs = getRandomQuestions('判断题', numJudge);
    const fillQs = getRandomQuestions('填空题', numFill);

    currentQuiz = [...singleQs, ...multipleQs, ...judgeQs, ...fillQs];

    if (currentQuiz.length === 0) {
        alert('请至少选择一道题目！');
        return;
    }

    renderQuiz();
    
    document.getElementById('config-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function getRandomQuestions(type, count) {
    const filtered = allQuestions.filter(q => q.type === type);
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function renderQuiz() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    currentQuiz.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.id = q.id;

        let html = `
            <div class="question-header">
                <span>第 ${index + 1} 题</span>
                <span>${q.type}</span>
            </div>
            <div class="question-text">${q.question}</div>
        `;

        if (q.type === '单选题' || q.type === '判断题') {
            html += `<ul class="options-list">`;
            q.options.forEach(opt => {
                html += `
                    <li class="option-item">
                        <label style="width: 100%; cursor: pointer;">
                            <input type="radio" name="q-${q.id}" value="${opt.label}">
                            ${opt.label}. ${opt.content}
                        </label>
                    </li>
                `;
            });
            html += `</ul>`;
        } else if (q.type === '多选题') {
            html += `<ul class="options-list">`;
            q.options.forEach(opt => {
                html += `
                    <li class="option-item">
                        <label style="width: 100%; cursor: pointer;">
                            <input type="checkbox" name="q-${q.id}" value="${opt.label}">
                            ${opt.label}. ${opt.content}
                        </label>
                    </li>
                `;
            });
            html += `</ul>`;
        } else if (q.type === '填空题') {
            // For fill-in-the-blank, we just show input boxes
            // Assuming answer is a list of objects {index: "1", text: "..."}
            if (Array.isArray(q.answer)) {
                q.answer.forEach((ans, idx) => {
                    html += `
                        <div style="margin-bottom: 10px;">
                            <label>空 ${ans.index}: </label>
                            <input type="text" class="fill-input" name="q-${q.id}-${idx}">
                        </div>
                    `;
                });
            }
        }

        card.innerHTML = html;
        container.appendChild(card);
    });
}

function submitQuiz() {
    let score = 0;
    const wrongAnswersContainer = document.getElementById('wrong-answers-container');
    wrongAnswersContainer.innerHTML = '';

    currentQuiz.forEach(q => {
        const card = document.querySelector(`.question-card[data-id="${q.id}"]`);
        let isCorrect = false;
        let userAnswer = '';
        let correctAnswerText = '';

        if (q.type === '单选题' || q.type === '判断题') {
            const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
            userAnswer = selected ? selected.value : '未作答';
            isCorrect = userAnswer === q.answer;
            correctAnswerText = q.answer;
        } else if (q.type === '多选题') {
            const selected = Array.from(document.querySelectorAll(`input[name="q-${q.id}"]:checked`)).map(el => el.value);
            userAnswer = selected.sort().join(' ');
            // q.answer for multiple choice is usually "A B C" string in JSON? 
            // Let's check how parse_to_json saves it. 
            // It saves as "A B C" string (space separated usually from the parsing logic if multiple spans)
            // Wait, the parser logic:
            // correct_answer = text (if multiple spans, it might be concatenated or just last one?)
            // Let's re-verify the parser logic for multiple choice.
            // In parse_to_json.py:
            // answer_spans = answer_div.find_all('span')
            // correct_answer = ""
            // for span in answer_spans: ...
            // This loop finds the FIRST span that is not "正确答案:".
            // If the HTML has multiple spans for answers (like A, B, C), the current logic might only get the first one or all text?
            // The HTML structure for multiple choice answer was:
            // <span ng-bind="ui.getCorrectOptions(subject)" class="ng-binding">A B C D</span>
            // So it is a SINGLE span with "A B C D". So q.answer will be "A B C D".
            
            // So we need to normalize spaces.
            const correctParts = q.answer.split(/\s+/).filter(s => s).sort();
            const userParts = selected.sort();
            
            isCorrect = JSON.stringify(correctParts) === JSON.stringify(userParts);
            userAnswer = userParts.join(' ') || '未作答';
            correctAnswerText = q.answer;
        } else if (q.type === '填空题') {
            // q.answer is array of {index, text}
            let allCorrect = true;
            let userAnsArr = [];
            let correctAnsArr = [];
            
            q.answer.forEach((ans, idx) => {
                const input = document.querySelector(`input[name="q-${q.id}-${idx}"]`);
                const val = input ? input.value.trim() : '';
                userAnsArr.push(`(${ans.index}) ${val}`);
                correctAnsArr.push(`(${ans.index}) ${ans.text}`);
                
                if (val !== ans.text) {
                    allCorrect = false;
                }
            });
            
            isCorrect = allCorrect;
            userAnswer = userAnsArr.join(', ');
            correctAnswerText = correctAnsArr.join(', ');
        }

        if (isCorrect) {
            score++;
            card.classList.add('status-correct');
        } else {
            card.classList.add('status-wrong');
            
            // Add feedback to the card
            const feedback = document.createElement('div');
            feedback.className = 'result-feedback';
            feedback.innerHTML = `
                <div>你的答案: <span class="user-answer-text">${userAnswer}</span></div>
                <div>正确答案: <span class="correct-answer-text">${correctAnswerText}</span></div>
            `;
            card.appendChild(feedback);
        }
    });

    document.getElementById('score').textContent = score;
    document.getElementById('total-score').textContent = currentQuiz.length;

    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('result-section').classList.remove('hidden');
    
    // Show all questions in result section (actually they are already in DOM, just hidden by parent)
    // We want to show the quiz section AGAIN but in "review mode"
    // So let's move the questions container to result section or just unhide quiz section?
    // Better approach: Keep quiz section visible, hide submit button, show result card at top.
    
    document.getElementById('quiz-section').classList.remove('hidden');
    document.getElementById('submit-btn').style.display = 'none';
    
    // Move result section to top of quiz section
    const quizSection = document.getElementById('quiz-section');
    const resultSection = document.getElementById('result-section');
    quizSection.insertBefore(resultSection, quizSection.firstChild);
    
    window.scrollTo(0, 0);
}

function restartApp() {
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('config-section').classList.remove('hidden');
    document.getElementById('submit-btn').style.display = 'block';
    
    // Move result section back to main container end (optional, but keeps structure clean)
    document.querySelector('.container').appendChild(document.getElementById('result-section'));
    
    window.scrollTo(0, 0);
}
