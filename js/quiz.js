import { db, appId, sendWhatsAppAlert, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc, deleteDoc, doc, setDoc, isPreview } from './data-store.js';
import { beginRound, decide, STAKES } from './truco-engine.js';
let match = null;
let round = null;
let selectedTeam = null;
let resultSaving = false;
const playedPrefix = isPreview ? 'wedding_demo_played_' : 'wedding_quiz_played_';

export function initQuiz() {
    window.chooseQuizTeam = team => {
        if (!['noivo', 'noiva'].includes(team)) return;
        selectedTeam = team;
        document.querySelectorAll('[data-quiz-team]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.quizTeam === team));
        });
    };
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
        return current || localStorage.getItem(`${playedPrefix}${participant.participantKey}`) === 'true';
    };

    const clearLocalPlayState = (ranking) => {
        if (!ranking) return;
        if (ranking.participantKey) {
            localStorage.removeItem(`${playedPrefix}${ranking.participantKey}`);
            return;
        }
        if (ranking.guestId) {
            localStorage.removeItem(`${playedPrefix}${ranking.guestId}`);
            localStorage.removeItem(`${playedPrefix}${ranking.guestId}:main`);
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
        if (!selectedTeam) return window.showToast('Escolha Time Noivo ou Time Noiva para começar.', true);
        if (!state.timeline.length) return window.showToast('Os noivos ainda estão preparando as cartas!', true);
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
        match = { id: crypto.randomUUID(), team: selectedTeam, player: 0, cpu: 0, questions: structuredClone(state.timeline), history: [] };
        round = null;
        state.currentQuizStep = 0;
        state.quizAnswersState = [];
        document.getElementById('quiz-entry-card').classList.add('hidden');
        document.getElementById('quiz-game-container').classList.remove('hidden');
        renderQuizStep();
    };

    window.answerQuizStep = (step, answer) => {
        if (!match || step !== state.currentQuizStep || round) return;
        round = beginRound(match.questions[step], answer);
        renderQuizStep();
    };
    window.trucoDecision = action => {
        if (!round || round.finished) return;
        try { round = decide(round, action); } catch { return; }
        if (round.finished) {
            match[round.winner] += round.points;
            match.history.push({ ...round });
        }
        renderQuizStep();
    };
    window.nextTrucoRound = () => {
        if (!round?.finished) return;
        round = null; state.currentQuizStep++;
        renderQuizStep();
    };
    window.retryTrucoSave = () => finishQuiz();

    // Expose only the small helper needed by the delete flow.
    window.clearQuizLocalPlayState = clearLocalPlayState;
}


const suits = ['♡', '⚭', '✿', '♫'];
const suitNames = ['Corações', 'Alianças', 'Buquês', 'Dança'];
const ranks = ['A', 'K', 'Q', 'J'];
const renderQuizStep = () => {
    const container = document.getElementById('quiz-game-container');
    const step = state.currentQuizStep;
    if (step >= match.questions.length) { finishQuiz(); return; }
    const q = match.questions[step];
    const scoreboard = '<div class="truco-score"><span>Time ' + (match.team === 'noivo' ? 'Noivo' : 'Noiva') + '<b>' + match.player + '</b></span><span class="score-divider">×</span><span>CPU<b>' + match.cpu + '</b></span></div>';
    const progress = '<p class="round-progress">Rodada ' + (step + 1) + ' / ' + match.questions.length + ' · ' + escapeHTML(state.activeQuizGuest.mainName) + '</p>';
    const cards = q.options.map((option, i) => {
        const chosen = round?.answer === i;
        const cpu = round?.cpuAnswer === i;
        const revealed = round?.finished;
        return '<button type="button" ' + (round ? 'disabled ' : '') + 'onclick="window.answerQuizStep(' + step + ',' + i + ')" class="wedding-card suit-' + i + (chosen ? ' chosen-card' : '') + (revealed && q.correct === i ? ' correct-card' : '') + '" style="--deal:' + i * 70 + 'ms">' +
            '<span class="card-corner">' + ranks[i] + '<small>' + suits[i] + '</small></span><span class="card-suit" aria-hidden="true">' + suits[i] + '</span><span class="card-answer">' + escapeHTML(option) + '</span>' +
            '<span class="card-caption">' + (chosen ? 'SUA CARTA' : cpu ? 'CARTA DA CPU' : suitNames[i]) + '</span>' +
            (revealed && q.correct === i ? '<span class="correct-label">Resposta certa</span>' : '') + '</button>';
    }).join('');
    let dispute = '';
    if (round) {
        if (!round.finished) {
            const stake = round.offered || round.accepted;
            const nextStake = STAKES[STAKES.indexOf(stake) + 1];
            dispute = '<div class="truco-dispute" aria-live="polite"><span class="cpu-avatar" aria-hidden="true">♠</span><h4>' + escapeHTML(round.log.at(-1)) + '</h4><p>CPU escolheu: “' + escapeHTML(q.options[round.cpuAnswer]) + '”</p><p>Em jogo: ' + stake + ' pontos · correr entrega ' + round.accepted + '.</p>' +
                '<div class="truco-actions"><button onclick="window.trucoDecision(\'accept\')">' + (round.offered ? 'Aceito! Abrir cartas' : 'Abrir cartas') + '</button>' +
                (nextStake ? '<button class="raise-button" onclick="window.trucoDecision(\'raise\')">' + (nextStake === 3 ? 'TRUCO!' : 'GRITO ' + nextStake + '!') + '</button>' : '') +
                '<button class="fold-button" onclick="window.trucoDecision(\'fold\')">Corro dessa</button></div></div>';
        } else {
            const explanation = round.reason === 'facão' ? 'Era FACÃO! A CPU estava blefando e você tinha a resposta certa.' :
                round.reason === 'cpu-fold' ? 'A CPU correu! Sua coragem levou a rodada.' :
                round.reason === 'player-fold' ? 'Você correu. Desta vez, a CPU tinha a resposta certa.' :
                round.winner === 'player' ? 'Sua carta estava certa. Essa mão é sua!' : 'A CPU levou essa. Na próxima, capricha no blefe!';
            dispute = '<div class="truco-dispute round-reveal" aria-live="polite"><h4>' + explanation + '</h4><p>' + (round.winner === 'player' ? 'Seu time' : 'CPU') + ' ganhou ' + round.points + ' ponto(s).</p><p>' + escapeHTML(q.text || '') + '</p><button onclick="window.nextTrucoRound()">' + (step + 1 === match.questions.length ? 'Ver placar final' : 'Próxima rodada →') + '</button></div>';
        }
    }
    container.innerHTML = '<div class="quiz-deal">' + scoreboard + progress + '<h4 class="question-title">' + escapeHTML(q.title) + '</h4><div class="wedding-hand">' + cards + '</div>' + dispute + '</div>';
};
const finishQuiz = async () => {
    if (!match || resultSaving) return;
    resultSaving = true;
    const container = document.getElementById('quiz-game-container');
    const participantKey = state.activeQuizGuest.participantKey;
    const title = match.player > match.cpu ? 'Seu time ganhou a mesa!' : match.player === match.cpu ? 'Empate! A festa decide na pista.' : 'A CPU ganhou. Mas o brinde é de todos!';
    container.innerHTML = '<div class="truco-finale"><span aria-hidden="true">⚭</span><h3>' + title + '</h3><p>Time ' + (match.team === 'noivo' ? 'Noivo' : 'Noiva') + ' ' + match.player + ' × ' + match.cpu + ' CPU</p><p id="truco-save-status" role="status">Salvando resultado…</p></div>';
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rankings', match.id), {
            guestId: state.activeQuizGuest.id, guestName: state.activeQuizGuest.mainName,
            participantKey, participantType: state.activeQuizGuest.participantType || 'main',
            team: match.team, score: match.player * 100, trucoPoints: match.player, cpuPoints: match.cpu, timestamp: new Date().toISOString()
        });
        localStorage.setItem(playedPrefix + participantKey, 'true');
        document.getElementById('truco-save-status').textContent = 'Resultado salvo! ' + match.player * 100 + ' pontos no ranking.';
    } catch (e) {
        document.getElementById('truco-save-status').innerHTML = 'Não foi possível salvar. <button onclick="window.retryTrucoSave()">Tentar novamente</button>';
    } finally { resultSaving = false; }
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
                localStorage.removeItem(`${playedPrefix}${ranking.participantKey}`);
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
