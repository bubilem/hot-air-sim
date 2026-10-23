// Encyklopedie: okno s kategoriemi vlevo a textem vpravo. Otevírá se ikonou vedle nastavení, hra se při čtení pozastaví.
import { t, getWiki } from '../i18n/index.js';
import brand from '@brand';

export const ICON_WIKI = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4.5 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 7.5-.5v13c-2-1-5-1-7.5.5-2.5-1.5-5.5-1.5-7.5-.5z"/><path d="M12 6v13"/></svg>`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class Encyclopedia {
  /**
   * @param {HTMLElement} root
   * @param {(open: boolean) => void} onToggle volá se při otevření / zavření (pozastavení hry)
   */
  constructor(root, onToggle) {
    this.onToggle = onToggle;
    this.isOpen = false;
    this.current = 0;
    this.el = document.createElement('div');
    this.el.className = 'wiki interactive';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', t('wiki.title'));
    root.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) { this.close(); return; }
      const cat = e.target.closest('[data-cat]');
      if (cat) { this.select(Number(cat.dataset.cat)); return; }
      if (e.target.closest('[data-f="close"]')) this.close();
    });
    this.onKey = (e) => { if (this.isOpen && e.code === 'Escape') this.close(); };
    window.addEventListener('keydown', this.onKey);
  }

  build() {
    const wiki = getWiki();
    this.el.innerHTML = `
      <div class="wiki-win panel">
        <div class="wiki-head">
          <b>${t('wiki.title')}</b>
          <span class="wiki-paused">${t('wiki.paused')}</span>
          <button class="set-close" data-f="close" aria-label="${t('wiki.close')}">✕</button>
        </div>
        <div class="wiki-main">
          <nav class="wiki-nav" aria-label="${t('wiki.back')}">
            ${wiki.map((c, i) => `<button data-cat="${i}"><span>${esc(c.title)}</span></button>`).join('')}
          </nav>
          <article class="wiki-text" data-f="text"></article>
        </div>
      </div>`;
    this.text = this.el.querySelector('[data-f="text"]');
    this.navBtns = [...this.el.querySelectorAll('[data-cat]')];
  }

  select(i) {
    const wiki = getWiki();
    this.current = Math.max(0, Math.min(wiki.length - 1, i));
    const c = wiki[this.current];
    const paras = c.body.map((p) => (p.startsWith('• ')
      ? `<li>${esc(p.slice(2))}</li>`
      : `</ul><p>${esc(p)}</p><ul>`)).join('');
    const link = c.link && brand.links?.study ? `<p><a href="${brand.links.study}" target="_blank" rel="noopener noreferrer">${esc(t('wiki.moreIt'))}</a></p>` : '';
    this.text.innerHTML = `<h2>${esc(c.title)}</h2><ul>${paras}</ul>`
      .replace(/<ul>\s*<\/ul>/g, '').replace(/<ul><\/ul>/g, '') + link;
    this.text.scrollTop = 0;
    this.navBtns.forEach((b, k) => {
      b.classList.toggle('on', k === this.current);
      b.setAttribute('aria-current', k === this.current ? 'true' : 'false');
    });
    this.navBtns[this.current]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  open() {
    if (this.isOpen) return;
    this.build();   // znovu při každém otevření: respektuje aktuální jazyk
    this.isOpen = true;
    this.el.hidden = false;
    this.select(this.current);
    this.onToggle?.(true);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.hidden = true;
    this.onToggle?.(false);
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    if (this.isOpen) this.onToggle?.(false);
    this.el.remove();
  }
}
