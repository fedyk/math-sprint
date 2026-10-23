const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
}
const files = ['index.html', 'pwa.js', 'manifest.webmanifest', ...walk('assets')].sort();
const template = fs.readFileSync('scripts/sw-template.js', 'utf8');
const hash = crypto.createHash('sha256').update(template);
for (const file of files) hash.update(file).update(fs.readFileSync(file));
const version = hash.digest('hex').slice(0, 16);
const worker = template.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files.map(file => './' + file)));
fs.mkdirSync('dist', { recursive: true });
for (const file of files) {
    fs.mkdirSync(path.dirname(path.join('dist', file)), { recursive: true });
    fs.copyFileSync(file, path.join('dist', file));
}
fs.writeFileSync('dist/sw.js', worker);
console.log(`Built ${files.length} offline assets (${version}).`);
