/* ==========================================================================
   Tiny Markdown renderer for the guide (no dependencies, works offline).

   Supported:
     ## / ### / #### / #####      headings (ids auto-generated)
     paragraph text
     - bullet / 1. ordered        lists, nestable with 2 spaces
     | a | b |                    tables (wrapped for horizontal scroll)
     ```lang ... ```              fenced code (light syntax highlight)
     > NOTE|TIP|WARN|DANGER|SRC   callouts
     ![alt](src "caption")        figures
     lines starting with "<"      raw HTML passthrough
     **bold** *em* `code` [t](u)  inline formatting
     ---                          horizontal rule
   ========================================================================== */

const ICONS = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.6"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.9 1 .9 1.7V16h5.4v-.5c0-.7.4-1.3.9-1.7A6 6 0 0 0 12 3Z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.3 2.6 17.6A1.9 1.9 0 0 0 4.3 20.5h15.4a1.9 1.9 0 0 0 1.7-2.9L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 16.8v.4"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m8.6 8.6 6.8 6.8M15.4 8.6l-6.8 6.8"/></svg>',
  src: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H15l4 4v13.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5Z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h7"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v6a4 4 0 0 1-4 4"/><path d="M15 7h4v6a4 4 0 0 1-4 4"/></svg>',
};

const CALLOUTS = {
  NOTE: 'note', HINT: 'note', INFO: 'note',
  TIP: 'tip', PROTIP: 'tip',
  WARNING: 'warn', CAUTION: 'warn', WARN: 'warn', IMPORTANT: 'warn',
  DANGER: 'danger', STOP: 'danger', SAFETY: 'danger',
  SOURCE: 'src', SRC: 'src', REF: 'src', MANUAL: 'src',
  QUOTE: 'quote', TASK: 'quote',
};

export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'sec';
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* --- inline --------------------------------------------------------------- */
const ALLOWED_TAG = /<(\/?)(kbd|code|br|b|i|u|em|strong|sub|sup|small|span|mark)(\s+[^<>]*)?\/?>/gi;

export function inline(src) {
  // protect a small whitelist of inline HTML tags, escape everything else
  const tags = [];
  let s0 = String(src).replace(ALLOWED_TAG, (m) => {
    tags.push(m);
    return `\u0003T${tags.length - 1}\u0003`;
  });
  let s = esc(s0);
  s = s.replace(/\u0003T(\d+)\u0003/g, (_, i) => tags[+i]);
  // inline code first, protected
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000C${codes.length - 1}\u0000`;
  });
  // kbd  [[CTRL]] -> <kbd>
  s = s.replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>');
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const ext = /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${u}"${ext}>${t}</a>`;
  });
  // images inline (rare)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000C(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  return s;
}

/* --- code highlight ------------------------------------------------------- */
const KEYWORDS =
  /\b(def|return|if|elif|else|for|while|in|not|and|or|import|from|class|try|except|with|as|pass|break|continue|None|True|False|await|const|let|var|function|new|do|end|then|endif|enddo|print)\b/g;

function highlight(code, lang) {
  let s = esc(code);
  const strs = [];
  s = s.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, (m) => {
    strs.push(m);
    return `\u0001S${strs.length - 1}\u0001`;
  });
  const cmts = [];
  s = s.replace(/(#[^\n]*|\/\/[^\n]*|;[^\n]*)/g, (m) => {
    cmts.push(m);
    return `\u0002K${cmts.length - 1}\u0002`;
  });
  s = s.replace(KEYWORDS, '<span class="k">$1</span>');
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="n">$1</span>');
  s = s.replace(/\u0002K(\d+)\u0002/g, (_, i) => `<span class="c">${cmts[+i]}</span>`);
  s = s.replace(/\u0001S(\d+)\u0001/g, (_, i) => `<span class="s">${strs[+i]}</span>`);
  return s;
}

/* --- blocks --------------------------------------------------------------- */
function renderTable(rows) {
  const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const numeric = body.every((r) => r.slice(1).every((c) => /^[-+0-9.,–—×/ ]*$/.test(c) && c !== ''));
  let h = `<div class="tablewrap"><table${numeric ? ' class="num"' : ''}><thead><tr>`;
  h += head.map((c) => `<th>${inline(c)}</th>`).join('');
  h += '</tr></thead><tbody>';
  for (const r of body) {
    h += '<tr>' + head.map((_, i) => `<td>${inline(r[i] ?? '')}</td>`).join('') + '</tr>';
  }
  return h + '</tbody></table></div>';
}

function renderList(items, ordered, startIndent) {
  const tag = ordered ? 'ol' : 'ul';
  let h = `<${tag}>`;
  let i = 0;
  while (i < items.length) {
    const { indent, text } = items[i];
    if (indent > startIndent) {
      // gather children
      const kids = [];
      while (i < items.length && items[i].indent > startIndent) kids.push(items[i++]);
      const childOrdered = /^\d+[.)]/.test(kids[0].text);
      const sub = kids.map((k) => ({ ...k, indent: k.indent - kids[0].indent }));
      h = h.slice(0, -5) + renderList(sub, childOrdered, 0) + '</li>';
      continue;
    }
    h += `<li>${inline(text.replace(/^([-*+]|\d+[.)])\s+/, ''))}</li>`;
    i++;
  }
  return h + `</${tag}>`;
}

export function renderMarkdown(md, opts = {}) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let i = 0;

  const pushHeading = (level, text) => {
    const id = (opts.idPrefix || '') + slug(text) + '-' + toc.filter((t) => slug(t.text) === slug(text)).length;
    if (level <= 4) toc.push({ level, text: text.replace(/\*\*|\*/g, ''), id });
    out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    // blank
    if (!line.trim()) { i++; continue; }

    // raw html block
    if (/^\s*</.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
      out.push(buf.join('\n'));
      continue;
    }

    // fenced code
    if (/^(```|~~~)/.test(line.trim())) {
      const fence = line.trim().slice(0, 3);
      const lang = line.trim().slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && lines[i].trim().indexOf(fence) !== 0) buf.push(lines[i++]);
      i++;
      const label = lang ? lang.toUpperCase() : 'CODE';
      out.push(
        `<div class="code-head"><span>${esc(label)}</span></div><pre><code>${highlight(buf.join('\n'), lang)}</code></pre>`
      );
      continue;
    }

    // heading
    const hm = line.match(/^(#{2,5})\s+(.*)$/);
    if (hm) { pushHeading(hm[1].length, hm[2].trim()); i++; continue; }

    // hr
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) { out.push('<hr>'); i++; continue; }

    // callout
    const cm = line.match(/^>\s*(\**([A-ZА-ЯЁ]{3,12})\**)\s*[—:|-]?\s*(.*)$/);
    if (cm && CALLOUTS[cm[2].toUpperCase()]) {
      const kind = CALLOUTS[cm[2].toUpperCase()];
      const title = cm[2].toUpperCase();
      const buf = [cm[3]];
      i++;
      while (i < lines.length && /^>/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const bodyMd = buf.join('\n').trim();
      out.push(
        `<div class="callout ${kind}"><span class="ico">${ICONS[kind] || ICONS.note}</span><div class="body"><div class="ttl">${esc(title)}</div>${renderMarkdown(bodyMd, { idPrefix: (opts.idPrefix || '') + 'x' })}</div></div>`
      );
      continue;
    }
    // plain blockquote
    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote class="callout quote"><span class="ico">${ICONS.quote}</span><div class="body">${renderMarkdown(buf.join('\n').trim(), { idPrefix: (opts.idPrefix || '') + 'q' })}</div></blockquote>`);
      continue;
    }

    // table
    if (/^\|/.test(line.trim()) && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1].trim())) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) rows.push(lines[i++].trim());
      out.push(renderTable(rows));
      continue;
    }

    // image / figure
    const im = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (im) {
      const cap = im[3] || '';
      out.push(
        `<figure><img src="${im[2]}" alt="${esc(im[1])}" loading="lazy">${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`
      );
      i++;
      continue;
    }

    // lists
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const runOrdered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (lm && /^\d+[.)]$/.test(lm[2]) === runOrdered) {
          items.push({ indent: lm[1].length, text: lm[3] });
          i++;
          // continuation lines of the same item
          while (i < lines.length && lines[i].trim() && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) && !/^\s*</.test(lines[i]) && !/^#{2,5}\s/.test(lines[i]) && !/^(```|~~~)/.test(lines[i].trim()) && !/^\|/.test(lines[i].trim()) && !/^>/.test(lines[i]) && !/^(-{3,}|\*{3,})\s*$/.test(lines[i].trim())) {
            items[items.length - 1].text += ' ' + lines[i].trim();
            i++;
          }
          continue;
        }
        break;
      }
      const ordered = runOrdered;
      let html = renderList(items, ordered, items[0].indent);
      if (opts.steps && ordered) html = html.replace('<ol>', '<ol class="steps">');
      out.push(html);
      continue;
    }

    // paragraph
    const buf = [line];
    i++;
    while (
      i < lines.length && lines[i].trim() &&
      !/^\s*</.test(lines[i]) && !/^#{2,5}\s/.test(lines[i]) && !/^(```|~~~)/.test(lines[i].trim()) &&
      !/^\|/.test(lines[i].trim()) && !/^>/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})\s*$/.test(lines[i].trim())
    ) { buf.push(lines[i++]); }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return opts.toc ? { html: out.join('\n'), toc } : out.join('\n');
}
