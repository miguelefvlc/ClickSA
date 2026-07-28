export const selectEl = id => document.getElementById(id);
export const queryAll = selector => document.querySelectorAll(selector);

export function normalizeTextForKeys(text) {
    if (!text) return "";
    let m = text.match(/CE\s*(\d+)/i);
    return m ? `CE${m[1]}` : text.trim().toUpperCase().replace(/\s+/g, '');
}

export function getSelectedText(selectId) {
    const s = selectEl(selectId);
    if (!s) return "";
    const w = s.nextElementSibling;
    if (w && w.classList.contains('custom-select-wrapper')) {
        const text = w.querySelector('.custom-select-trigger span').textContent.trim();
        return text && text !== "Sense dades / Tria Cicle" ? text : "";
    }
    return s.options && s.selectedIndex >= 0 ? s.options[s.selectedIndex].text : "";
}

export function toggleCustomOptionVisibility(val, show, selectId) {
    const wrap = selectEl(selectId)?.nextElementSibling;
    if (!wrap || !wrap.classList.contains('custom-select-wrapper')) return;
    Array.from(wrap.querySelectorAll('.custom-option')).forEach(opt => {
        let optVal = opt.dataset.value || opt.textContent;
        if (optVal === val) opt.style.display = show ? 'block' : 'none';
    });
}
