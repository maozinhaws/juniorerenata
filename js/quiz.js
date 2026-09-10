import { db, appId, sendWhatsAppAlert, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initQuiz() {
    const quizInput = document.getElementById('quiz-guest-name');
    
    if (quizInput && !document.getElementById('quiz-suggestions')) {
        const sug = document.createElement('div');
        sug.id = 'quiz-suggestions';
        // Estilo moderno e destacado idêntico ao exemplo azul solicitado
        sug.className = 'absolute left-0 right-0 top-full mt-2 bg-white border border-stone-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50 hidden divide-y divide-stone-100 p-1.5';
        quizInput.parentElement.style.position = 'relative';
        quizInput.parentElement.appendChild(sug);
    }

    if (quizInput) {
        quizInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            const sugBox = document.getElementById('quiz-suggestions');
            if (!sugBox) return;
            if (query.length < 2) {
                sugBox.classList.add('hidden');
                return;
            }
            const matches = state.guests.filter(g => g.mainName && g.mainName.toLowerCase().includes(query));
            if (!matches.length) {
                sugBox.innerHTML = `<div class="p-3 text-xs text-stone-400 text-center">Convidado não encontrado na lista oficial.</div>`;
                sugBox.classList.remove('hidden');
                return;
            }
            sugBox.innerHTML = matches.map(g => `
                <div class="p-3 hover:bg-stone-100 rounded-xl text-xs font-semibold cursor-pointer text-stone-800 transition-colors" data-quiz-guest-name="${escapeHTML(g.mainName)}">
                    ${escapeHTML(g.mainName)}
                </div>
            `).join('');
            sugBox.classList.remove('hidden');
        });

        const sugBox = document.getElementById('quiz-suggestions');
        if (sugBox) {
            sugBox.addEventListener('click', (e) => {
                const item = e.target.closest('[data-quiz-guest-name]');
                if (!item) return;
                quizInput.value = item.dataset.quizGuestName;
                sugBox.classList.add('hidden');
            });
        }
    }

    window.startCoupleQuiz = () => {
        const nameInput = document.getElementById('quiz-guest-name').value.trim().toLowerCase();
        if (!nameInput || nameInput.length < 2) return window.showToast("Digite seu nome completo para iniciar!", true);

        const found = state.guests.find(g => g.mainName && g.mainName.toLowerCase() === nameInput);
        if (!found) return window.showToast("Nome exato não encontrado na lista oficial de convidados! Selecione na lista suspensa.", true);

        state.activeQuizGuest = found;
        const alreadyPlayedKey = `wedding_quiz_played_${found.id}`;
        if (localStorage.getItem(alreadyPlayedKey) === 'true') {
            return window.showToast("Você já concluiu o desafio! Apenas 1 tentativa permitida.", true);
        }

        state.currentQuizStep = 0;
        state.quizAnswersState = [];
        document.getElementById('quiz-entry-card').classList.add('hidden');
        document.getElementById('quiz-game-container').classList.remove('hidden');
        renderQuizStep();
    };

    window.answerQuizStep = (step, chosenIdx, correctIdx) => {
        state.quizAnswersState.push({ step, chosenIdx, correctIdx, isCorrect: chosenIdx === correctIdx });
        state.currentQuizStep++;
        renderQuizStep();
    };
}

const renderQuizStep = () => {
    const container = document.getElementById('quiz-game-container');
    const step = state.currentQuizStep;
    const timeline = state.timeline;

    if (step >= timeline.length) {
        finishQuiz();
        return;
    }

    const q = timeline[step];
    const options = q.options || ["Opção A", "Opção B", "Opção C", "Opção D"];

    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-400 border-b pb-3">
                <span>Convidado: ${escapeHTML(state.activeQuizGuest.mainName)}</span>
                <span class="text-red-600">Pergunta ${step + 1} de ${timeline.length}</span>
            </div>
            <div class="space-y-2">
                <span class="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">${escapeHTML(q.tag)}</span>
                <h4 class="font-serif text-2xl md:text-3xl font-bold text-stone-900">${escapeHTML(q.title)}</h4>
            </div>
            <div class="space-y-3 pt-2">
                ${options.map((opt, idx) => `
                    <button onclick="window.answerQuizStep(${step}, ${idx}, ${q.correct})" class="w-full text-left p-4 rounded-2xl border border-stone-200 hover:border-red-400 hover:bg-red-50 text-sm font-semibold transition-all bg-white shadow-xs cursor-pointer flex items-center justify-between">
                        <span class="flex items-center gap-3"><span class="w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold shrink-0">${['A','B','C','D'][idx]}</span> ${escapeHTML(opt)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    lucide.createIcons();
};

const finishQuiz = async () => {
    const correctCount = state.quizAnswersState.filter(a => a.isCorrect).length;
    const score = correctCount * 100;

    localStorage.setItem(`wedding_quiz_played_${state.activeQuizGuest.id}`, 'true');

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), {
            guestId: state.activeQuizGuest.id,
            guestName: state.activeQuizGuest.mainName,
            score: score,
            timestamp: new Date().toISOString()
        });
        sendWhatsAppAlert(`🎮 Placar Quiz: ${state.activeQuizGuest.mainName} fez ${score} pontos.`);
    } catch(e) { console.error(e); }

    const container = document.getElementById('quiz-game-container');
    container.innerHTML = `
        <div class="space-y-6 text-center animate-fadeIn">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><i data-lucide="award" class="w-8 h-8"></i></div>
            <h3 class="font-serif text-3xl font-bold text-stone-900">Desafio Concluído!</h3>
            <p class="text-stone-600 text-sm">Você acertou <b class="text-emerald-600">${correctCount} de ${state.timeline.length}</b> perguntas e somou <b class="text-red-600">${score} pontos</b> no ranking!</p>
            <button onclick="location.reload()" class="py-3 px-6 bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer">Ver Ranking Geral</button>
        </div>
    `;
    lucide.createIcons();
};

export function renderRanking() {
    const list = document.getElementById('public-ranking-list');
    if (!list) return;
    if (!state.rankings.length) {
        list.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-stone-400 text-xs">Nenhum convidado pontuou ainda. Seja o primeiro!</td></tr>`;
        return;
    }
    list.innerHTML = state.rankings.slice(0, 10).map((r, i) => `
        <tr class="border-b last:border-0">
            <td class="py-3 font-bold text-red-600">#${i + 1}</td>
            <td class="py-3 text-stone-900">${escapeHTML(r.guestName)}</td>
            <td class="py-3 text-right font-bold text-emerald-600">${r.score} pts</td>
        </tr>
    `).join('');
}
