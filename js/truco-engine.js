export const STAKES = [1, 3, 6, 9];
export function beginRound(question, answer, random = Math.random) {
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) throw new Error('Alternativa inválida.');
    const wrong = question.options.map((_, i) => i).filter(i => i !== answer);
    const cpuAnswer = answer !== question.correct ? question.correct : wrong[Math.floor(random() * wrong.length)];
    const round = { answer, cpuAnswer, correct: question.correct, accepted: 1, offered: null, turn: 'player', finished: false, winner: null, points: 0, reason: '', log: [] };
    // The CPU knows the answer, but the player only discovers it at the reveal.
    if (answer !== question.correct || random() < .55) {
        round.offered = 3;
        round.log.push('CPU: TRUCO! Vale três. Vai encarar?');
    } else round.log.push('CPU escolheu outra carta. Você pode revelar ou pedir truco.');
    return round;
}
function finish(round, winner, points, reason) {
    return { ...round, offered: null, finished: true, winner, points, reason };
}
export function decide(round, action, random = Math.random) {
    if (round.finished) throw new Error('Rodada encerrada.');
    let next = { ...round, log: [...round.log] };
    const correct = round.answer === round.correct;
    if (action === 'fold') return finish(next, 'cpu', round.accepted, correct ? 'facão' : 'player-fold');
    if (action === 'accept') {
        const stake = round.offered || round.accepted;
        next.accepted = stake;
        return finish(next, correct ? 'player' : 'cpu', stake, 'reveal');
    }
    if (action !== 'raise') throw new Error('Ação inválida.');
    const current = round.offered || round.accepted;
    const index = STAKES.indexOf(current);
    if (index === STAKES.length - 1) throw new Error('Nove é a aposta máxima.');
    // A re-raise first accepts the opponent's outstanding offer.
    next.accepted = current;
    const raised = STAKES[index + 1];
    next.offered = raised;
    next.log.push('Você: ' + (raised === 3 ? 'TRUCO!' : raised + '!'));
    const roll = random();
    if (roll < .22) {
        next.log.push('CPU: corri! Essa é sua.');
        return finish(next, 'player', current, 'cpu-fold');
    }
    if (raised < 9 && roll < .64) {
        next.accepted = raised;
        next.offered = STAKES[index + 2];
        next.log.push('CPU: ' + next.offered + '! Quero ver sua coragem.');
        return next;
    }
    next.accepted = raised;
    next.log.push('CPU: aceito. Vamos abrir as cartas!');
    return finish(next, correct ? 'player' : 'cpu', raised, 'reveal');
}
