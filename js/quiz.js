import { db, appId, sendWhatsAppAlert, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initQuiz() {
    const quizInput = document.getElementById('quiz-guest-name');
    const sugBox = document.getElementById('quiz-suggestions');

    const getParticipants = () => {
        const participants = [];
        state.guests.forEach((guest) => {
            if (guest.mainName) {
                participants.push({
                    participantKey: `${guest.id}:main`,
                    guestId: guest.id,
                    name: guest.mainName,
                    type: 'main',
                    guest
                });
            }
            (guest.companions || []).forEach((companion, index) => {
                if (!companion?.name) return;
                participants.push({
                    participantKey: `${guest.id}:companion:${index}`,
                    guestId: guest.id,
                    name: companion.name,
                    type: 'companion',
                    companionIndex: index,
                    guest
                });
            });
        });
        return participants;
    };

    const findParticipantByKey = (key) => getParticipants().find(p => p.participantKey === key);

    const hasPlayed = (participant) => {
        if (!participant) return false;
        const current = state.rankings.some(r => {
            if (r.participantKey) return r.participantKey === participant.participantKey;
            // Compatibility with rankings created by the previous version.
            return participant.type === 'main' && r.guestId === participant.guestId;
        });
        return current || localStorage.getItem(`wedding_quiz_played_${participant.participantKey}`) === 'true';
    };

    const clearLocalPlayState = (ranking) => {
        if (!ranking) return;
        if (ranking.participantKey) {
            localStorage.removeItem(`wedding_quiz_played_${ranking.participantKey}`);
            return;
        }
        if (ranking.guestId) {
            localStorage.removeItem(`wedding_quiz_played_${ranking.guestId}`);
            localStorage.removeItem(`wedding_quiz_played_${ranking.guestId}:main`);
        }
    };

    if (quizInput && sugBox) {
        quizInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                sugBox.classList.add('hidden');
                return;
            }

            const matches = getParticipants().filter(p => p.name.toLowerCase().includes(query));
            if (!matches.length) {
                sugBox.innerHTML = `<div class="p-3 text-xs text-stone-400 text-center">Convidado ou acompanhante não encontrado na lista oficial.</div>`;
                sugBox.classList.remove('hidden');
                return;
            }

            sugBox.innerHTML = matches.map(p => `
                <div class="p-3 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-800 transition-colors cursor-pointer" data-quiz-participant-key="${escapeHTML(p.participantKey)}">
                    <span>${escapeHTML(p.name)}</span>
                    <span class="block text-[10px] text-stone-400 font-normal">${p.type === 'main' ? 'Convidado principal' : 'Acompanhante'}</span>
                </div>
            `).join('');
            sugBox.classList.remove('hidden');
        });

        sugBox.addEventListener('click', (e) => {
            const item = e.target.closest('[data-quiz-participant-key]');
            if (!item) return;
            const participant = findParticipantByKey(item.dataset.quizParticipantKey);
            if (!participant) return;
            quizInput.value = participant.name;
            quizInput.dataset.participantKey = participant.participantKey;
            sugBox.classList.add('hidden');
        });
    }

    window.startCoupleQuiz = () => {
        const nameInput = quizInput?.value.trim().toLowerCase();
        const selectedKey = quizInput?.dataset.participantKey;
        if (!nameInput || nameInput.length < 2) return window.showToast("Selecione seu nome na lista suspensa!", true);

        let participant = selectedKey ? findParticipantByKey(selectedKey) : null;
        if (!participant) {
            participant = getParticipants().find(p => p.name.toLowerCase() === nameInput);
        }
        if (!participant) return window.showToast("Você precisa selecionar um nome válido da lista oficial de convidados ou acompanhantes!", true);

        if (hasPlayed(participant)) {
            return window.showToast("Você já concluiu o desafio! Apenas 1 tentativa permitida por pessoa.", true);
        }

        state.activeQuizGuest = {
            ...participant.guest,
            mainName: participant.name,
            participantKey: participant.participantKey,
            participantType: participant.type,
            companionIndex: participant.companionIndex ?? null
        };
        state.currentQuizStep = 0;
        state.quizAnswersState = [];
        document.getElementById('quiz-entry-card').classList.add('hidden');
        document.getElementById('quiz-game-container').classList.remove('hidden');
        renderQuizStep();
    };

    window.answerQuizStep = (step, chosenIdx, correctIdx) => {
        // Ignore accidental double clicks after advancing the question.
        if (step !== state.currentQuizStep) return;
        state.quizAnswersState.push({ step, chosenIdx, correctIdx, isCorrect: chosenIdx === correctIdx });
        state.currentQuizStep++;
        renderQuizStep();
    };

    // Expose only the small helper needed by the delete flow.
    window.clearQuizLocalPlayState = clearLocalPlayState;
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
                    <button type="button" onclick="window.answerQuizStep(${step}, ${idx}, ${q.correct})" class="w-full text-left p-4 rounded-2xl border border-stone-200 hover:border-red-400 hover:bg-red-50 text-sm font-semibold transition-all bg-white shadow-xs cursor-pointer flex items-center justify-between">
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

    const participantKey = state.activeQuizGuest.participantKey || `${state.activeQuizGuest.id}:main`;
    localStorage.setItem(`wedding_quiz_played_${participantKey}`, 'true');

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), {
            guestId: state.activeQuizGuest.id,
            guestName: state.activeQuizGuest.mainName,
            participantKey: participantKey,
            participantType: state.activeQuizGuest.participantType || 'main',
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
            <button type="button" onclick="location.reload()" class="py-3 px-6 bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer">Ver Ranking Geral</button>
        </div>
    `;
    lucide.createIcons();
};

export function renderRanking() {
    const list = document.getElementById('public-ranking-list');
    if (!list) return;
    if (!state.rankings.length) {
        list.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-stone-400 text-xs">Nenhum convidado pontuou ainda. Seja o primeiro!</td></tr>`;
        return;
    }
    list.innerHTML = state.rankings.slice(0, 10).map((r, i) => `
        <tr class="border-b last:border-0">
            <td class="py-3 font-bold text-red-600">#${i + 1}</td>
            <td class="py-3 text-stone-900">${escapeHTML(r.guestName)}</td>
            <td class="py-3 text-right font-bold text-emerald-600">${r.score} pts</td>
            <td class="py-3 text-right admin-ranking-col ${state.isAdminLoggedIn ? '' : 'hidden'}">
                <button type="button" onclick="window.deleteRankingEntry('${r.id}')" class="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer">Excluir</button>
            </td>
        </tr>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

window.deleteRankingEntry = (id) => {
    window.openDeleteModal("Deseja realmente excluir esta pontuação do ranking? Ao excluir, essa pessoa poderá jogar novamente.", async () => {
        try {
            const ranking = state.rankings.find(r => r.id === id);
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rankings', id));

            // Important: deleting the ranking also removes the local lock.
            if (typeof window.clearQuizLocalPlayState === 'function') {
                window.clearQuizLocalPlayState(ranking);
            } else if (ranking?.participantKey) {
                localStorage.removeItem(`wedding_quiz_played_${ranking.participantKey}`);
            }

            window.showToast("Pontuação excluída. Essa pessoa já pode jogar novamente!");
        } catch(e) {
            window.showToast("Erro ao excluir pontuação.", true);
        }
    });
};

window.clearEntireRanking = () => {
    window.openDeleteModal("Deseja realmente zerar todo o ranking do quiz? Todas as pessoas ficarão livres para jogar novamente.", async () => {
        try {
            for (const r of state.rankings) {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rankings', r.id));
                if (typeof window.clearQuizLocalPlayState === 'function') {
                    window.clearQuizLocalPlayState(r);
                }
            }
            window.showToast("Ranking zerado. Todos podem jogar novamente!");
        } catch(e) {
            window.showToast("Erro ao zerar ranking.", true);
        }
    });
};
