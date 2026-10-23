const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const worker = fs.readFileSync('dist/sw.js', 'utf8');
function setup() {
    const handlers = {}, cache = new Map();
    let network = true, claimed = false, skipped = false;
    const scope = 'https://example.test/';
    const context = vm.createContext({ URL, Request, Promise,
        self: { registration: { scope }, location: { origin: 'https://example.test' },
            clients: { claim: async () => { claimed = true; } },
            skipWaiting: async () => { skipped = true; },
            addEventListener: (name, fn) => { handlers[name] = fn; } },
        caches: { open: async () => ({
            addAll: async requests => { for (const request of requests) cache.set(request.url, fs.readFileSync('dist/' + new URL(request.url).pathname.slice(1))); },
            match: async request => cache.get(typeof request === 'string' ? request : request.url)
        }), keys: async () => [], delete: async () => true },
        fetch: async () => { if (!network) throw new Error('offline'); return 'network'; }
    });
    vm.runInContext(worker, context);
    async function event(name, extra = {}) {
        let pending;
        handlers[name]({ waitUntil: p => { pending = p; }, respondWith: p => { pending = p; }, ...extra });
        return await pending;
    }
    return { event, cache, offline: () => { network = false; }, claimed: () => claimed, skipped: () => skipped };
}
test('offline build contains only local runtime resources and every cached file exists', () => {
    const html = fs.readFileSync('dist/index.html', 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        assert.ok(match[1].startsWith('./'), match[1]);
        assert.ok(fs.existsSync('dist/' + match[1]));
    }
    for (const file of ['assets/app.css', 'assets/vendor/fontawesome.css']) {
        const css = fs.readFileSync('dist/' + file, 'utf8');
        assert.ok(!/url\(["']?https?:/.test(css));
        for (const match of css.matchAll(/url\(["']?([^)'" ]+)/g)) {
            assert.ok(fs.existsSync(require('node:path').resolve('dist', require('node:path').dirname(file), match[1])), match[1]);
        }
    }
});
test('worker caches full app, launches without network, and verifies readiness against actual cache', async () => {
    const s = setup(); await s.event('install'); await s.event('activate'); s.offline();
    assert.equal(s.claimed(), true);
    const response = await s.event('fetch', { request: { url: 'https://example.test/?installed=1', method: 'GET', mode: 'navigate' } });
    assert.ok(response.toString().includes('WHO IS PLAYING?'));
    let ready;
    const message = { data: { type: 'CHECK_OFFLINE' }, ports: [{ postMessage: data => { ready = data.ready; } }] };
    await s.event('message', message); assert.equal(ready, true);
    s.cache.delete('https://example.test/assets/app.css');
    await s.event('message', message); assert.equal(ready, false);
});
test('worker waits for explicit update activation', async () => {
    const s = setup(); await s.event('install'); assert.equal(s.skipped(), false);
    await s.event('message', { data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(s.skipped(), true);
});
