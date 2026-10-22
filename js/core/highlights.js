/** Safe annotation helpers: imported strings are always handled as text. */
const EXCLUDED = 'script,style,noscript,.hl-toolbar,table.gloss';

function nodes(root) {
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(root, 4);
  const result = [];
  let node;
  let offset = 0;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest(EXCLUDED)) continue;
    result.push({ node, start: offset, end: offset + node.data.length });
    offset += node.data.length;
  }
  return result;
}

function rangeText(range) {
  return nodes(range.cloneContents()).map(({ node }) => node.data).join('');
}

/** Offsets count the original section text, including text inside existing marks. */
export function selectionOffsets(section, range) {
  if (!section || !range || !section.contains(range.startContainer) || !section.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(section);
  before.setEnd(range.startContainer, range.startOffset);
  const selected = rangeText(range);
  const leading = selected.length - selected.trimStart().length;
  const trimmed = selected.trim();
  if (!trimmed) return null;
  const start = rangeText(before).length + leading;
  return { start, end: start + trimmed.length };
}

/** Restore legacy text-only records or precise newer anchors without altering prose. */
export function restoreHighlights(panel, records, colorForCategory = () => '#F5D949') {
  if (!panel || !Array.isArray(records)) return 0;
  let restored = 0;
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || typeof record.text !== 'string' || !record.text.trim()) continue;
    if ([...panel.querySelectorAll('mark.uhl')].some(mark => mark.dataset.hid === record.id)) continue;
    const sourceId = record.source?.id;
    if (typeof sourceId !== 'string') continue;
    const section = [...panel.querySelectorAll('section.lo')].find(element => element.id === `sec-${sourceId}`);
    if (!section) continue;
    const parts = nodes(section);
    const text = parts.map(({ node }) => node.data).join('');
    const needle = record.text.trim();
    const available = (start, end) => parts.filter(part => part.end > start && part.start < end)
      .every(part => !part.node.parentElement.closest('mark.uhl'));
    let start = -1;
    const anchor = record.anchor;
    if (Number.isInteger(anchor?.start) && Number.isInteger(anchor?.end) && anchor.start >= 0 && anchor.end <= text.length && text.slice(anchor.start, anchor.end) === needle && available(anchor.start, anchor.end)) {
      start = anchor.start;
    } else {
      let index = text.indexOf(needle);
      while (index !== -1) {
        if (available(index, index + needle.length)) { start = index; break; }
        index = text.indexOf(needle, index + 1);
      }
    }
    if (start === -1) continue;
    const end = start + needle.length;
    const affected = parts.filter(part => part.end > start && part.start < end).reverse();
    for (const part of affected) {
      const localStart = Math.max(start - part.start, 0);
      const localEnd = Math.min(end - part.start, part.node.data.length);
      if (localEnd <= localStart) continue;
      const selected = part.node.splitText(localStart);
      selected.splitText(localEnd - localStart);
      const mark = section.ownerDocument.createElement('mark');
      mark.className = 'uhl';
      mark.dataset.hid = record.id;
      mark.style.background = colorForCategory(record.category);
      selected.replaceWith(mark);
      mark.append(selected);
    }
    restored++;
  }
  return restored;
}
