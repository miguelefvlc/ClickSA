import { selectEl, queryAll, getSelectedText, toggleCustomOptionVisibility } from './utils.js';
import { AppState, saveState } from './state.js';
import { CONSTANTES_GLOBALES, SELECTS_TO_RESET } from './constants.js';
import { fetchCsvData } from './api.js';
import { getAreaActiva, getCicleActiu, establecerConexionesSaber, establecerConexionesCA, establecerConexionesCE, recalcularTotaLaCadena, updateCellVisual } from './curriculum.js';

export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode'); 
    selectEl('dark-icon').className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

export function toggleBlock(id) { 
    const block = selectEl(id);
    const icon = selectEl('icon-' + id); 
    if(!block || !icon) return;
    const isHidden = block.style.display === 'none' || block.style.display === ''; 
    block.style.display = isHidden ? 'block' : 'none'; 
    icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)'; 
}

export function inicialitzarDesplegablesIncials() {
    buildCustomSelect('input-area', CONSTANTES_GLOBALES.llistaAreas, null);
    buildCustomSelect('input-cicle', ["Primer Cicle", "Segon Cicle", "Tercer Cicle"], null);
    SELECTS_TO_RESET.forEach(id => buildCustomSelect(id, [], null));
    makeTagsSortable(selectEl('tags-od'));
}

export async function handleAreaCicleChange() {
    if (AppState.isRestoring) return;
    const area = getAreaActiva(), cicle = getCicleActiu();
    if (!area || area === '-' || !cicle || cicle === '-') return;

    const loadingMsg = selectEl('loading-msg');
    if (!AppState.cacheDadesCurriculars[area]) AppState.cacheDadesCurriculars[area] = {};
    
    if (AppState.cacheDadesCurriculars[area][cicle]) {
        AppState.lastValidArea = area;
        AppState.lastValidCicle = cicle;
        return actualitzarDesplegablesCurriculars(area, cicle);
    }

    const url = CONSTANTES_GLOBALES.urlsData[area]?.[cicle];
    if (!url) {
        mostrarModalConstruccio();
        return actualitzarDesplegablesCurricularsVuit();
    }

    loadingMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connectant amb la base de dades.';
    try {
        await fetchCsvData(area, cicle, url);
        loadingMsg.innerHTML = '';
        AppState.lastValidArea = area;
        AppState.lastValidCicle = cicle;
        actualitzarDesplegablesCurriculars(area, cicle);
    } catch (e) {
        loadingMsg.innerHTML = '❌ No hem pogut connectar a la base de dades.';
    }
}

export function actualitzarDesplegablesCurricularsVuit() {
    if (selectEl('btn-toggle-t')) selectEl('btn-toggle-t').classList.remove('active');
    queryAll('.selection-area').forEach(el => { if(!el.id.startsWith('tags-dest') && !el.id.startsWith('tags-n3') && !el.id.startsWith('tags-n4')) el.innerHTML = ''; });
    SELECTS_TO_RESET.forEach(id => buildCustomSelect(id, [], null));
    queryAll('.cc-cell').forEach(cell => { cell.setAttribute('data-fulltext', cell.dataset.desc); cell.classList.remove('auto-active'); updateCellVisual(cell); });
}

export function actualitzarDesplegablesCurriculars(area, cicle) {
    if (selectEl('btn-toggle-t')) selectEl('btn-toggle-t').classList.remove('active');
    const d = AppState.cacheDadesCurriculars[area][cicle]; 
    if (!d) return;
    
    queryAll('.selection-area').forEach(el => { if(!el.id.startsWith('tags-dest') && !el.id.startsWith('tags-n3') && !el.id.startsWith('tags-n4') && el.id !== 'tags-od') el.innerHTML = ''; });
    
    [
        ['input-curs', d.curs], ['input-trimestre', d.trimestre], ['select-obj-gen', d.objectiusGenerals, 'tags-obj-gen'], ['select-ods', d.ods, 'tags-ods'],
        ['select-comp-espec', d.competenciesEspecifiques, 'tags-comp-espec'], ['select-criteris', d.criterisAvaluacio, 'tags-criteris'], ['select-blocs', d.blocsContinguts, 'tags-blocs'],
        ['select-sabers', d.sabersBasics, 'tags-sabers'], ['select-metodologia', d.metodologia, 'tags-metodologia'], ['select-agrupaments', d.agrupaments, 'tags-agrupaments'],
        ['select-instruments', d.instrumentsAvaluacio, 'tags-instruments'], ['select-tipus-avaluacio', d.tipusAvaluacio, 'tags-tipus-avaluacio'],
        ['select-dua-acces', d.representacio, 'tags-dua-acces'], ['select-dua-part', d.motivacio, 'tags-dua-part'], ['select-dua-prog', d.accio, 'tags-dua-prog']
    ].forEach(m => buildCustomSelect(m[0], m[1], m[2]));

    queryAll('.cc-cell').forEach(cell => cell.setAttribute('data-fulltext', d.descriptoresMap?.[cell.dataset.desc] || cell.dataset.desc));
    recalcularTotaLaCadena();
}

export function setCustomSelectValue(selectId, value) {
    const sel = selectEl(selectId); if (!sel) return; sel.value = value;
    const w = sel.nextElementSibling;
    if (w?.classList.contains('custom-select-wrapper')) w.querySelector('.custom-select-trigger span').textContent = value;
}

export function buildCustomSelect(selectId, opciones, containerId) {
    const ori = selectEl(selectId); if(!ori) return;
    if (ori.nextElementSibling?.classList.contains('custom-select-wrapper')) ori.nextElementSibling.remove();
    
    const wrap = document.createElement('div'); wrap.className = 'custom-select-wrapper';
    const trig = document.createElement('div'); trig.className = 'custom-select-trigger'; 
    trig.innerHTML = '<span></span><i class="fa-solid fa-chevron-down"></i>'; trig.setAttribute('tabindex', '0');
    trig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trig.click(); } });
    ori.value = "";

    const optsDiv = document.createElement('div'); optsDiv.className = 'custom-options';
    let ops = [...opciones];
    
    if (['select-sabers', 'select-metodologia', 'select-agrupaments', 'select-instruments', 'select-tipus-avaluacio', 'select-dua-acces', 'select-dua-part', 'select-dua-prog'].includes(selectId) || selectId.startsWith('select-dest-') || selectId.startsWith('select-n3-') || selectId.startsWith('select-n4-')) ops.push("Altre...");

    if (ops.length === 0) {
        optsDiv.innerHTML = '<div class="custom-option" style="color:var(--text-muted);font-style:italic;">Sense dades / Tria Cicle</div>';
    } else {
        ops.forEach(o => {
            const opt = document.createElement('div'); opt.className = 'custom-option'; 
            let displayText = o, finalValue = o, isShaded = false;

            if (selectId === 'select-sabers' && o !== "Altre...") {
                const cicle = getCicleActiu(), upperO = o.toUpperCase();
                if ((cicle === 'Primer Cicle' && !upperO.includes('1ER')) || (cicle === 'Segon Cicle' && !upperO.includes('2ON')) || (cicle === 'Tercer Cicle' && !upperO.includes('3ER'))) isShaded = true;
                displayText = o.replace(/\s*\([^)]*(?:1ER|2ON|3ER)[^)]*\)/gi, '').trim();
                finalValue = displayText;
            }

            opt.textContent = displayText; opt.setAttribute('tabindex', '0');
            opt.dataset.value = finalValue;
            if (isShaded) opt.style.opacity = '0.4';
            opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); } });

            if (o === "Altre...") { 
                opt.style.cssText = "color:var(--accent);font-weight:bold;font-style:italic;"; 
            } else { 
                assignColorClass(opt, finalValue, containerId || 'tags-' + selectId.replace('select-', '')); 
                if (AppState.itemsAmbEstrella.has(o)) opt.innerHTML = displayText + ' <i class="fa-solid fa-star" style="color: var(--text-muted); opacity: 0.6; float: right; margin-top: 3px;" title="Destacat"></i>'; 
            }
            
            opt.onclick = () => {
                const finalize = v => {
                    if(containerId) addTag(v, containerId); 
                    else { trig.querySelector('span').textContent = v; ori.value = v; if (selectId === 'input-area' || selectId === 'input-cicle') handleAreaCicleChange(); }
                    optsDiv.classList.remove('open'); wrap.style.zIndex = '1'; trig.focus();
                };
                if (o === "Altre...") showCustomPrompt(v => { if (v) finalize(v); }); else finalize(finalValue);
            };
            optsDiv.appendChild(opt);
        });
    }
    
    trig.onclick = e => { 
        e.stopPropagation(); 
        queryAll('.custom-options').forEach(el => { if(el !== optsDiv) { el.classList.remove('open'); if(el.parentElement) el.parentElement.style.zIndex = '1'; } }); 
        optsDiv.classList.toggle('open'); wrap.style.zIndex = optsDiv.classList.contains('open') ? '9999' : '1'; 
    };
    wrap.append(trig, optsDiv); ori.style.display = 'none'; ori.parentNode.insertBefore(wrap, ori.nextSibling);
}

export function addTag(val, containerId) {
    const c = selectEl(containerId);
    if (!val || Array.from(c.querySelectorAll('.tag-text')).some(s => (s.dataset.fulltext || s.innerText) === val)) return;
    
    const selectId = containerId.replace('tags-', 'select-');
    let isTransversal = false;
    let displayText = val;

    if (containerId === 'tags-od') {
        let parts = val.match(/^(.*?)\s+-\s+(.*)/);
        if (parts) {
            displayText = `<strong>${parts[1]}</strong> - ${parts[2]}`;
        }
    }
    
    if (containerId === 'tags-sabers') {
        const dades = AppState.cacheDadesCurriculars[getAreaActiva()]?.[getCicleActiu()];
        if (dades && dades.sabersTransversals && dades.sabersTransversals.includes(val)) {
            isTransversal = true;
            const codeMatch = val.match(/^([A-Z0-9.\/-]+)/i);
            displayText = codeMatch ? codeMatch[1] : 'Saber(T)';
        }
    }

    const tag = document.createElement('div');
    
    if (isTransversal) {
        tag.className = 'mini-saber-tag';
        tag.title = val; 
        
        let n = AppState.sabersColors[val];
        if(n && n >= 1 && n <= 6) tag.classList.add(`mini-tag-ce${n}`);
        else tag.style.cssText = 'background:var(--tag-bg);color:var(--tag-text);border-color:var(--tag-border);';

        tag.innerHTML = `<span class="tag-text" data-fulltext="${val.replace(/"/g, '&quot;')}">${displayText}</span> <i class="fa-solid fa-xmark remove-x-mini"></i>`;
        
        let wrapper = c.querySelector('.transversals-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'transversals-wrapper';
            c.insertBefore(wrapper, c.firstChild);
        }
        
        tag.querySelector('.remove-x-mini').onclick = (e) => {
            e.stopPropagation();
            tag.remove();
            if (wrapper.children.length === 0) wrapper.remove(); 
            toggleCustomOptionVisibility(val, true, selectId);
            const btnT = selectEl('btn-toggle-t');
            if (btnT) btnT.classList.remove('active');
            recalcularTotaLaCadena();
        };
        
        wrapper.appendChild(tag);

    } else {
        tag.className = 'tag'; tag.draggable = true;
        assignColorClass(tag, val, containerId);
        tag.innerHTML = `<span class="tag-text" data-fulltext="${val.replace(/"/g, '&quot;')}">${displayText}</span><div class="remove-x" title="Eliminar"><i class="fa-solid fa-xmark"></i></div>`;
        
        tag.querySelector('.remove-x').onclick = () => {
            tag.remove();
            toggleCustomOptionVisibility(val, true, selectId);
            if (['tags-sabers', 'tags-comp-espec', 'tags-criteris'].includes(containerId)) recalcularTotaLaCadena();
            saveState();
        };
        
        c.appendChild(tag); makeTagsSortable(c);
    }
    
    toggleCustomOptionVisibility(val, false, selectId);
    
    if (containerId === 'tags-sabers') establecerConexionesSaber(val); 
    if (containerId === 'tags-criteris') establecerConexionesCA(val);
    if (containerId === 'tags-comp-espec') establecerConexionesCE();
    
    saveState();
}

export function makeTagsSortable(container) {
    if (!container || container.dataset.sortableInitialized) return; container.dataset.sortableInitialized = "true";
    let drg = null;
    container.addEventListener('dragstart', e => { if(e.target.classList.contains('tag')) { drg = e.target; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; } });
    container.addEventListener('dragend', e => { if(e.target.classList.contains('tag')) { e.target.classList.remove('dragging'); drg = null; saveState(); } });
    container.addEventListener('dragover', e => {
        e.preventDefault(); if(!drg || !drg.classList.contains('tag')) return;
        const after = [...container.querySelectorAll('.tag:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect(), offset = e.clientY - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (drg.nextElementSibling !== after) {
            after == null ? container.appendChild(drg) : container.insertBefore(drg, after);
        }
    });
}

export function assignColorClass(el, val, cId) {
    let n = null, m;
    if (cId === 'tags-comp-espec' && (m = val.match(/^CE\s*(\d+)/i))) n = m[1];
    else if (cId === 'tags-criteris' && (m = val.match(/^CA\s*(\d+)/i))) n = m[1];
    else if (cId === 'tags-sabers') n = AppState.sabersColors[val];
    else if (cId === 'tags-od' && (m = val.match(/CA\s*(\d+)/i))) n = m[1];

    if(n && n >= 1 && n <= 6) el.classList.add((el.classList.contains('tag') ? 'tag-ce' : 'opt-ce') + n);
}

export function showCustomPrompt(callback) {
    const modal = selectEl('custom-prompt-modal'), input = selectEl('custom-prompt-input');
    input.value = ''; modal.classList.add('show'); setTimeout(() => input.focus(), 50); 
    const cleanup = () => { selectEl('custom-prompt-ok').onclick = selectEl('custom-prompt-cancel').onclick = input.onkeydown = null; };
    const action = cb => () => { modal.classList.remove('show'); cleanup(); callback(cb ? input.value.trim() : null); };
    selectEl('custom-prompt-ok').onclick = action(true); selectEl('custom-prompt-cancel').onclick = action(false);
    input.onkeydown = e => { if(e.key === 'Enter') action(true)(); else if(e.key === 'Escape') action(false)(); };
}

export function toggleTransversals() {
    const btn = selectEl('btn-toggle-t');
    if (!btn) return;
    
    const area = getAreaActiva();
    const cicle = getCicleActiu();
    const dades = AppState.cacheDadesCurriculars[area]?.[cicle];
    if (!dades || !dades.sabersTransversals || dades.sabersTransversals.length === 0) return;
    
    const isActive = btn.classList.toggle('active');
    
    if (isActive) {
        dades.sabersTransversals.forEach(saber => {
            addTag(saber, 'tags-sabers');
        });
    } else {
        const wrapper = document.querySelector('#tags-sabers .transversals-wrapper');
        if (wrapper) {
            const tags = Array.from(wrapper.querySelectorAll('.mini-saber-tag'));
            tags.forEach(tag => {
                const val = tag.querySelector('.tag-text').dataset.fulltext || tag.querySelector('.tag-text').innerText;
                tag.remove();
                toggleCustomOptionVisibility(val, true, 'select-sabers');
            });
            wrapper.remove();
        }
        recalcularTotaLaCadena();
        saveState();
    }
}

export function mostrarModalConstruccio() {
    const modal = selectEl('construction-modal');
    if (!modal) return;
    modal.classList.add('show');

    const closeBtn = selectEl('btn-close-construction');
    const closeHandler = () => {
        tancarModalConstruccio();
        closeBtn?.removeEventListener('click', closeHandler);
        modal.removeEventListener('click', overlayHandler);
        document.removeEventListener('keydown', keyHandler);
    };

    const overlayHandler = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };

    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            closeHandler();
        }
    };

    closeBtn?.addEventListener('click', closeHandler);
    modal.addEventListener('click', overlayHandler);
    document.addEventListener('keydown', keyHandler);
}

function tancarModalConstruccio() {
    selectEl('construction-modal')?.classList.remove('show');
    const area = AppState.lastValidArea || '';
    const cicle = AppState.lastValidCicle || '';
    setCustomSelectValue('input-area', area);
    setCustomSelectValue('input-cicle', cicle);

    if (area && cicle && AppState.cacheDadesCurriculars[area]?.[cicle]) {
        actualitzarDesplegablesCurriculars(area, cicle);
    } else {
        actualitzarDesplegablesCurricularsVuit();
    }
}
