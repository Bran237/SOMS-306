// Preserve the original SOMS worked-example controls in the modular Studio.
export function bindSourceTracing(root){
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-tbaction]');
    if (!button || !root.contains(button)) return;
    if (button.dataset.tbaction === 'flashSrc'){
      const scope = button.closest('.lo-section, .nb, .notebook-suite') || root;
      const matches = [...scope.querySelectorAll('[data-src]')].filter(node => node.dataset.src === button.dataset.src);
      for (const node of matches){
        node.classList.add('flash');
        setTimeout(() => node.classList.remove('flash'), 1300);
      }
      matches[0]?.scrollIntoView({behavior:'smooth', block:'center'});
    }else if (button.dataset.tbaction === 'walkNext'){
      // IDs repeat between the source summary and notebook explanation; stay local.
      const scope = button.closest('.lo-section, .nb') || button.closest('[data-suite-section]') || root;
      const list = [...scope.querySelectorAll('[id]')].find(node => node.id === button.dataset.list);
      if (!list) return;
      const next = list.querySelector('li[hidden]');
      if (next) next.hidden = false;
      if (!list.querySelector('li[hidden]')){
        button.textContent = 'All steps revealed ✓';
        button.disabled = true;
      }
    }
  });
}
