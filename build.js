#!/usr/bin/env node

const fs   = require('fs');
const path = require('path');

const MD_DIR    = path.join(__dirname, 'md');
const BLOGS_DIR = path.join(__dirname, 'blogs');
const INDEX     = path.join(__dirname, 'index.html');

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ─── Inline markdown → HTML ──────────────────────────────────────────────────

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseInline(text) {
    // Protect inline code from escaping and other transforms
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
        codes.push(`<code>${escapeHtml(c)}</code>`);
        return `\x00${codes.length - 1}\x00`;
    });

    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    text = text
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,  '<img src="$2" alt="$1">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,   '<a href="$2">$1</a>')
        .replace(/\*\*\*(.+?)\*\*\*/g,         '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g,              '<strong>$1</strong>')
        .replace(/__(.+?)__/g,                   '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,                   '<em>$1</em>')
        .replace(/_(.+?)_/g,                     '<em>$1</em>')
        .replace(/~~(.+?)~~/g,                   '<del>$1</del>');

    return text.replace(/\x00(\d+)\x00/g, (_, i) => codes[+i]);
}

// ─── Block markdown → HTML ───────────────────────────────────────────────────

function parseMarkdown(md) {
    const lines = md.split('\n');
    const out   = [];
    let i    = 0;
    let para = [];

    function flushPara() {
        if (!para.length) return;
        out.push(`<p>${parseInline(para.join(' '))}</p>`);
        para = [];
    }

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        if (line.startsWith('```')) {
            flushPara();
            const lang = line.slice(3).trim();
            const attr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
            const code = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) code.push(escapeHtml(lines[i++]));
            out.push(`<pre><code${attr}>${code.join('\n')}\n</code></pre>`);
            i++;
            continue;
        }

        // ATX heading
        const hm = line.match(/^(#{1,6})\s+(.+)$/);
        if (hm) {
            flushPara();
            const n = hm[1].length;
            out.push(`<h${n}>${parseInline(hm[2])}</h${n}>`);
            i++; continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            flushPara();
            out.push('<hr>');
            i++; continue;
        }

        // Blockquote
        if (line.startsWith('>')) {
            flushPara();
            const bq = [];
            while (i < lines.length && lines[i].startsWith('>')) bq.push(lines[i++].replace(/^>\s?/, ''));
            out.push(`<blockquote>\n<p>${parseInline(bq.join(' '))}</p>\n</blockquote>`);
            continue;
        }

        // Unordered list
        if (/^[-*+]\s/.test(line)) {
            flushPara();
            const items = [];
            while (i < lines.length && /^[-*+]\s/.test(lines[i]))
                items.push(`<li>${parseInline(lines[i++].replace(/^[-*+]\s+/, ''))}</li>`);
            out.push(`<ul>\n${items.join('\n')}\n</ul>`);
            continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(line)) {
            flushPara();
            const items = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i]))
                items.push(`<li>${parseInline(lines[i++].replace(/^\d+\.\s+/, ''))}</li>`);
            out.push(`<ol>\n${items.join('\n')}\n</ol>`);
            continue;
        }

        // Table (GFM): collect consecutive pipe-containing lines
        if (line.includes('|')) {
            flushPara();
            const rows = [];
            while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(lines[i++]);

            const isSep = r => /^[\|\s\-:]+$/.test(r);
            const hasSep = rows.length > 1 && isSep(rows[1]);
            const tableRows = hasSep
                ? [{ row: rows[0], th: true }, ...rows.slice(2).map(r => ({ row: r, th: false }))]
                : rows.map(r => ({ row: r, th: false }));

            const rowsHtml = tableRows.map(({ row, th }) => {
                const tag   = th ? 'th' : 'td';
                const cells = row.split('|').map(c => c.trim()).filter(c => c !== '');
                return `<tr>${cells.map(c => `<${tag}>${parseInline(c)}</${tag}>`).join('')}</tr>`;
            });
            out.push(`<table>\n${rowsHtml.join('\n')}\n</table>`);
            continue;
        }

        // Blank line
        if (!line.trim()) { flushPara(); i++; continue; }

        // Default: accumulate paragraph
        para.push(line);
        i++;
    }

    flushPara();
    return out.join('\n');
}

// ─── Front matter ────────────────────────────────────────────────────────────

function parseFrontMatter(content) {
    if (!content.startsWith('---\n')) return { fields: {}, body: content };
    const end = content.indexOf('\n---', 4);
    if (end === -1) return { fields: {}, body: content };
    const fields = {};
    content.slice(4, end).split('\n').forEach(line => {
        const ci = line.indexOf(':');
        if (ci > -1) fields[line.slice(0, ci).trim()] = line.slice(ci + 1).trim();
    });
    return { fields, body: content.slice(end + 4).trimStart() };
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Blog post template ──────────────────────────────────────────────────────

function renderBlog(title, date, description, bodyHtml) {
    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${description.replace(/"/g, '&quot;')}">
        <title>${escapeHtml(title)}</title>
        <link rel="icon" href="../favicon.svg">
        <link rel="stylesheet" href="../styles.css" />
    </head>
    <body>
        <article>
            <header>
                <a href="../index.html" class="back-button">&lt;</a>
                <h1>${escapeHtml(title)}</h1>
                <div class="meta">Published: ${date}</div>
            </header>
            <main>
${bodyHtml.trim()}
            </main>
        </article>
    </body>
</html>`;
}

// ─── Convert md/ → blogs/ ───────────────────────────────────────────────────

function processMarkdownFiles() {
    if (!fs.existsSync(MD_DIR)) return;
    const files = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md'));
    for (const filename of files) {
        const content = fs.readFileSync(path.join(MD_DIR, filename), 'utf8');
        const { fields, body } = parseFrontMatter(content);

        const h1Match   = body.match(/^#\s+(.+)$/m);
        const title     = fields.title       || (h1Match ? h1Match[1] : path.basename(filename, '.md'));
        const date      = fields.date        || todayIso();
        const desc      = fields.description || '';
        const slug      = fields.slug        || slugify(path.basename(filename, '.md'));

        const html    = renderBlog(title, date, desc, parseMarkdown(body));
        const outPath = path.join(BLOGS_DIR, `${slug}.html`);
        fs.writeFileSync(outPath, html);
        console.log(`Converted: md/${filename} → blogs/${slug}.html`);
    }
}

// ─── Rebuild index.html ──────────────────────────────────────────────────────

function formatDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return `${MONTHS[month - 1]} ${String(day).padStart(2, '0')}, ${year}`;
}

function extractMeta(html) {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title      = titleMatch ? titleMatch[1].trim() : '(untitled)';
    const dateMatch  = html.match(/Published:\s*(\d{4}-\d{2}-\d{2})/);
    const isoDate    = dateMatch ? dateMatch[1] : '1970-01-01';
    const descMatch  = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    let description  = descMatch ? descMatch[1] : '';
    if (!description) {
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch) {
            const pMatch = mainMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (pMatch) description = pMatch[1].replace(/<[^>]+>/g, '').trim();
        }
    }
    return { title, isoDate, description };
}

function buildIndex() {
    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.html'));
    const posts = files.map(filename => {
        const slug = path.basename(filename, '.html');
        const html = fs.readFileSync(path.join(BLOGS_DIR, filename), 'utf8');
        return { slug, ...extractMeta(html) };
    });
    posts.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    const items = posts.map(({ slug, title, isoDate, description }) =>
        `<li>\n<h2><a href="blogs/${slug}.html">${title}</a></h2>\n` +
        `<time>${formatDate(isoDate)}</time>\n<p>${description}</p>\n</li>`
    ).join('\n');

    let index = fs.readFileSync(INDEX, 'utf8');
    index = index.replace(/(<ul class="posts">)[\s\S]*?(<\/ul>)/, `$1\n${items}\n$2`);
    fs.writeFileSync(INDEX, index);
    console.log(`Built index.html with ${posts.length} posts.`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

processMarkdownFiles();
buildIndex();
