import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

test('reading highlights restore safely across inline nodes and repeated text', async () => {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const script = await readFile(new URL('../js/core/highlights.js', import.meta.url));
  const server = createServer((request, response) => {
    if (request.url === '/highlights.js') response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(script);
    else response.writeHead(200, { 'Content-Type': 'text/html' }).end('<main id="reading"><section class="lo" id="sec-lo3.1"><p>Alpha <em>beta</em> gamma. repeat repeat.</p><table class="gloss"><tr><td>excluded glossary</td></tr></table></section></main>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const executablePath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const result = await page.evaluate(async () => {
      const { restoreHighlights, selectionOffsets } = await import('/highlights.js');
      const panel = document.querySelector('#reading');
      const section = document.querySelector('section');
      const literal = document.createElement('p');
      literal.textContent = '<img src=x onerror="window.unsafe=true">';
      section.append(literal);
      const before = section.textContent;
      const lastText = section.querySelector('p').lastChild;
      const range = document.createRange();
      const offset = lastText.data.lastIndexOf('repeat');
      range.setStart(lastText, offset); range.setEnd(lastText, offset + 6);
      const anchor = selectionOffsets(section, range);
      const records = [
        { id: 'inline', text: 'beta gamma', category: 'definition', source: { id: 'lo3.1' } },
        { id: 'repeat', text: 'repeat', source: { id: 'lo3.1' }, anchor },
        { id: 'literal', text: literal.textContent, source: { id: 'lo3.1' } },
        { id: 'excluded', text: 'excluded glossary', source: { id: 'lo3.1' } },
      ];
      const restored = restoreHighlights(panel, records, () => '#fff099');
      const repeated = panel.querySelector('[data-hid="repeat"]');
      return {
        restored, secondPass: restoreHighlights(panel, records), before, after: section.textContent,
        inlineParts: panel.querySelectorAll('[data-hid="inline"]').length,
        repeatBefore: repeated.previousSibling.textContent,
        hasOriginalEmphasis: !!section.querySelector('em mark'),
        hasInjectedImage: !!section.querySelector('img'), unsafe: !!window.unsafe,
        excluded: !!panel.querySelector('[data-hid="excluded"]'),
      };
    });
    assert.equal(result.restored, 3);
    assert.equal(result.secondPass, 0);
    assert.equal(result.before, result.after);
    assert.equal(result.inlineParts, 2);
    assert.ok(result.repeatBefore.endsWith('repeat '));
    assert.equal(result.hasOriginalEmphasis, true);
    assert.equal(result.hasInjectedImage, false);
    assert.equal(result.unsafe, false);
    assert.equal(result.excluded, false);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
