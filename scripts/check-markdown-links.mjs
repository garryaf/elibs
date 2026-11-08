import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';

const root = process.cwd();
const excludedDirectories = new Set(['node_modules', '.next', 'coverage', '.git']);

function findMarkdownFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        findMarkdownFiles(join(directory, entry.name), files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(root, join(directory, entry.name)));
    }
  }
  return files;
}

const markdownFiles = findMarkdownFiles(root);
const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const broken = [];

for (const file of markdownFiles) {
  const contents = readFileSync(resolve(root, file), 'utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');
  for (const match of contents.matchAll(linkPattern)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;

    const targetPath = target.split('#', 1)[0].split('?', 1)[0];
    const absoluteTarget = resolve(dirname(resolve(root, file)), targetPath);
    if (!existsSync(absoluteTarget) || !statSync(absoluteTarget).isFile()) {
      broken.push(`${file}: ${target} (${relative(root, absoluteTarget)} not found)`);
    }
  }
}

if (broken.length) {
  console.error('Broken local Markdown links:\n' + broken.join('\n'));
  process.exit(1);
}

console.log(`Verified ${markdownFiles.length} Markdown files: all local links resolve.`);
