const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
function app(saved) {
    let now = 1000;
    const elements = new Map(), intervals = new Map(), timeouts = new Map();
    let id = 0, stored = saved ? JSON.stringify(saved) : null;
    function element() {
        const classes = new Set();
        return { innerHTML: '', innerText: '', value: '', children: [],
            classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: x => classes.has(x) ? classes.delete(x) : classes.add(x) },
            appendChild(child) { this.children.push(child); }, remove() {}, focus() {} };
    }
    const context = vm.createContext({ console, Date: class extends Date { static now() { return now; } },
        window: { addEventListener() {} },
        document: { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
        localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
        setInterval: fn => { intervals.set(++id, fn); return id; }, clearInterval: id => intervals.delete(id),
        setTimeout: fn => { timeouts.set(++id, fn); return id; }, clearTimeout: id => timeouts.delete(id),
        confirm: () => true
    });
    const run = code => vm.runInContext(code, context);
    run(script); run('soundEnabled = false; loadProfiles(); activeProfileId = Object.keys(profiles)[0];');
    return { run, elements, intervals, timeouts, context, advance: ms => { now += ms; }, saved: () => JSON.parse(stored) };
}
function profile(tables, division) { return { id: 'p', name: 'Player', unlockedTables: tables, ...(division ? { unlockedDivisionTables: division } : {}), tableFastCounts: {}, highScore: 42, totalFastAnswers: 5, sessions: [{ score: 42 }] }; }
const all = Array.from({ length: 11 }, (_, i) => i + 2);

test('migration preserves history and existing division progress, starts eligible profiles at division 2', () => {
    for (const [tables, division, expected] of [[[2,3], undefined, []], [all, undefined, [2]], [all, [2,3,4], [2,3,4]]]) {
        const a = app({ p: profile(tables, division) });
        assert.deepEqual(a.saved().p.unlockedDivisionTables, expected);
        assert.equal(a.saved().p.highScore, 42);
        assert.deepEqual(a.saved().p.sessions, [{ score: 42 }]);
    }
});
test('mixed pool repeats D D D M and samples every unlocked division table with integer quotients 2–12', () => {
    const a = app({ p: profile(all, [2,3,4]) });
    a.run('startGame()');
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
        assert.equal(a.run('currentOperation'), i % 4 < 3 ? 'division' : 'multiplication');
        if (i % 4 < 3) {
            const divisor = a.run('currentFactorB'), quotient = a.run('currentFactorA / currentFactorB');
            seen.add(divisor); assert.ok([2,3,4].includes(divisor));
            assert.ok(Number.isInteger(quotient) && quotient >= 2 && quotient <= 12);
        }
        a.run('nextQuestion()');
    }
    assert.deepEqual([...seen].sort(), [2,3,4]);
});
test('fast threshold includes 5000ms, division credits only divisor once, multiplication squares twice', () => {
    const a = app({ p: profile(all, [2]) }); a.run('startGame()');
    a.run("currentOperation = 'division'; currentFactorA = 4; currentFactorB = 2; handleCorrectAnswer(5000)");
    assert.equal(a.run('sessionDivisionFastCount[2]'), 1);
    assert.equal(a.run('sessionDivisionFastCount[4] || 0'), 0);
    a.run("currentOperation = 'division'; currentFactorA = 6; currentFactorB = 2; handleCorrectAnswer(5001)");
    assert.equal(a.run('sessionDivisionFastCount[2]'), 1);
    a.run("currentOperation = 'multiplication'; currentFactorA = 3; currentFactorB = 3; handleCorrectAnswer(5000)");
    assert.equal(a.run('sessionFastCount[3]'), 2);
});
test('unlocking multiplication 12 also opens division 2 and logs both; only one division level per round', () => {
    const a = app({ p: profile(all.slice(0,-1)) });
    a.run('startGame(); sessionFastCount[11] = 10; endGame()');
    assert.deepEqual(a.saved().p.sessions.at(-1).unlockedTables, ['×12', '÷2']);
    a.run('startGame(); sessionDivisionFastCount[2] = 9; endGame()');
    assert.deepEqual(a.saved().p.unlockedDivisionTables, [2]);
    a.run('startGame(); sessionDivisionFastCount[2] = 10; sessionDivisionFastCount[3] = 20; endGame()');
    assert.deepEqual(a.saved().p.unlockedDivisionTables, [2,3]);
    assert.deepEqual(a.saved().p.sessions.at(-1).unlockedTables, ['÷3']);
});
test('backspace removes one digit', () => {
    const a = app(); a.run('startGame(); currentInput = "144"; clearInput()');
    assert.equal(a.run('currentInput'), '14');
    a.run('clearInput(); clearInput(); clearInput()'); assert.equal(a.run('currentInput'), '');
});
test('declining leave pauses round and answer timing; confirming discards results and pending mistake callback', () => {
    const a = app(); a.run('startGame()');
    const before = a.saved();
    a.context.confirm = () => { a.advance(10000); return false; };
    a.run("showScreen('profile-screen')");
    assert.equal(a.run('roundActive'), true);
    assert.equal(a.run('roundDeadline'), 131000);
    assert.equal(a.run('problemStartTime'), 11000);
    a.run('handleWrongAnswer(6)'); const callback = [...a.timeouts.values()].at(-1);
    a.context.confirm = () => true;
    a.run("showScreen('profile-screen')");
    assert.equal(a.run('roundActive'), false); assert.equal(a.intervals.size, 0);
    assert.deepEqual(a.saved(), before);
    const questionIndex = a.run('questionIndex'); callback();
    assert.equal(a.run('questionIndex'), questionIndex);
});
test('timer expires during mistake feedback, saves once, and clears delayed question', () => {
    const a = app(); a.run('startGame(); handleWrongAnswer(6)');
    a.advance(120000); [...a.intervals.values()][0]();
    assert.equal(a.run('roundActive'), false);
    assert.equal(a.timeouts.size, 0);
    assert.equal(a.saved().kid_k.sessions.length, 1);
    a.run('endGame()'); assert.equal(a.saved().kid_k.sessions.length, 1);
});
test('background pause blocks input and freezes timer until explicit Resume, excluding pause from fast answers', () => {
    const a = app(); a.run('startGame()'); a.advance(2000);
    a.run('pauseRound()'); const question = a.run('questionIndex');
    a.advance(60000); [...a.intervals.values()][0]();
    assert.equal(a.run('roundActive'), true);
    a.run('appendInput("9"); submitAnswer()');
    assert.equal(a.run('currentInput'), ''); assert.equal(a.run('questionIndex'), question);
    a.run('resumeRound()');
    assert.equal(a.run('roundDeadline - Date.now()'), 118000);
    assert.equal(a.run('Date.now() - problemStartTime'), 2000);
    a.run('currentInput = String(currentFactorA * currentFactorB); submitAnswer()');
    assert.equal(a.run('totalFastAnswers'), 1);
});
test('mistake feedback resumes its remaining duration after background pause', () => {
    const a = app(); a.run('startGame(); handleWrongAnswer(6)'); a.advance(400);
    a.run('pauseRound()'); assert.equal(a.run('wrongFeedbackRemaining'), 800);
    a.advance(20000); a.run('resumeRound()');
    assert.equal(a.run('wrongFeedbackDeadline - Date.now()'), 800);
    a.advance(800); [...a.timeouts.values()].at(-1)();
    assert.equal(a.run('isProcessingWrong'), false);
    assert.equal(a.run('questionIndex'), 2);
});
