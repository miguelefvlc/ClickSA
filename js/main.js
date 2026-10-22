import { selectEl, queryAll } from './utils.js';
import { fetchDiversitat } from './api.js';
import { inicialitzarDesplegablesIncials, toggleDarkMode, toggleBlock, toggleTransversals } from './ui.js';
import { saveState, restoreState, clearState, getStateObject } from './state.js';
import { setMesures, addDestinatari, makeSequenceSortable, addSequenceStep, addSession, addActivity, toggleEval, showCriteriaDropdown, updateStepNumbers, updateGlobalSessionNumbers, addObjectiveDidactic } from './sequenceBuilder.js';
import { generatePDF, generateJSON, importJSON } from './export.js';
import { recalcularTotaLaCadena, updateCellVisual } from './curriculum.js';
import { 
    initSupabase, getCurrentUser, onAuthStateChange, signInWithEmail, signUpWithEmail, 
    signInWithGoogle, resetPassword, signOutUser, saveSAToCloud, fetchUserSAs, 
    fetchSAById, deleteSAFromCloud, getActiveCloudSAId, setActiveCloudSAId, isCloudConfigured 
} from './cloud.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.classList.contains('dark-mode')) {
        selectEl('dark-icon').className = 'fa-solid fa-sun';
    } else {
        selectEl('dark-icon').className = 'fa-solid fa-moon';
    }

    fetchDiversitat();
    inicialitzarDesplegablesIncials();
    setupTooltipListeners();
    makeSequenceSortable();
    await restoreState();

    const addSaveListener = (selector, eventType) => queryAll(selector).forEach(el => el.addEventListener(eventType, saveState));
    addSaveListener('input, textarea', 'input');
    
    // Configurar listeners básicos    
    const btnDarkMode = selectEl('btn-dark-mode');
    if (btnDarkMode) btnDarkMode.addEventListener('click', () => { toggleDarkMode(); });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'global_dark_mode') {
            const shouldBeDark = e.newValue === 'true';
            const selectIco = selectEl('dark-icon');
            if (shouldBeDark) {
                document.body.classList.add('dark-mode');
                if (selectIco) selectIco.className = 'fa-solid fa-sun';
            } else {
                document.body.classList.remove('dark-mode');
                if (selectIco) selectIco.className = 'fa-solid fa-moon';
            }
        }
    });

    const btnToggleT = selectEl('btn-toggle-t');
    if (btnToggleT) btnToggleT.addEventListener('click', toggleTransversals);
    queryAll('.toggle-section').forEach(btn => btn.addEventListener('click', e => { 
        if(e.target.closest('.btn-toggle-block')) return; 
        toggleBlock(btn.dataset.target); 
    }));

    queryAll('.btn-toggle-block').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        const blockId = btn.dataset.block;
        const container = btn.closest('.section-container');
        const isDisabling = !container.classList.contains('disabled-block');
        
        container.classList.toggle('disabled-block');
        btn.querySelector('i').className = isDisabling ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        
        const blockContent = document.getElementById(blockId);
        const iconToggle = document.getElementById('icon-' + blockId);
        if (isDisabling) {
            blockContent.style.display = 'none';
            iconToggle.style.transform = 'rotate(0deg)';
        } else {
            blockContent.style.display = 'block';
            iconToggle.style.transform = 'rotate(180deg)';
        }
        saveState();
    }));

    const btnMesuresSi = selectEl('btn-mesures-si');
    if (btnMesuresSi) btnMesuresSi.addEventListener('click', () => setMesures(true));
    const btnMesuresNo = selectEl('btn-mesures-no');
    if (btnMesuresNo) btnMesuresNo.addEventListener('click', () => setMesures(false));
    const btnAddDestinatari = selectEl('btn-add-destinatari');
    if (btnAddDestinatari) btnAddDestinatari.addEventListener('click', addDestinatari);
    
    const btnAddStep = selectEl('btn-add-step');
    if (btnAddStep) btnAddStep.addEventListener('click', addSequenceStep);
    
    const btnAddOd = selectEl('btn-add-od');
    if (btnAddOd) btnAddOd.addEventListener('click', addObjectiveDidactic);
    
    const odCriteriaContainer = selectEl('od-criteria-container');
    if (odCriteriaContainer) odCriteriaContainer.addEventListener('click', e => {
        const btnAddCritOD = e.target.closest('.btn-add-crit-od');
        if (btnAddCritOD) {
            showCriteriaDropdown(btnAddCritOD, 'od-criteria-container', 'CA');
        }
    });
    
    // Event delegation
    const temporalitzacioContainer = selectEl('temporalitzacio-container');
    if (temporalitzacioContainer) temporalitzacioContainer.addEventListener('click', e => {
        if (e.target.classList.contains('week-box')) {
            e.target.classList.toggle('active');
            saveState();
        }
    });

    const sequenceContainer = selectEl('sequence-container');
    if (sequenceContainer) sequenceContainer.addEventListener('click', e => {
        if (e.target.closest('.criteria-dropdown')) return; 

        const btnRemoveStep = e.target.closest('.btn-remove-step');
        const btnRemoveAct = e.target.closest('.btn-remove-act');
        const btnAddAct = e.target.closest('.btn-add-act');
        const btnAddSess = e.target.closest('.btn-add-sess');
        const btnEval = e.target.closest('.btn-eval');
        const btnAddCrit = e.target.closest('.btn-add-crit');

        if (btnRemoveStep) {
            btnRemoveStep.closest('.sequence-step').remove();
            updateStepNumbers();
            updateGlobalSessionNumbers();
            saveState();
        } else if (btnRemoveAct) {
            btnRemoveAct.closest('.sequence-activity').remove();
            saveState();
        } else if (btnAddAct) {
            addActivity(btnAddAct.closest('.sequence-step').id);
        } else if (btnAddSess) {
            addSession(btnAddSess.closest('.sequence-step').id);
        } else if (btnEval) {
            const actId = btnEval.closest('.sequence-activity').querySelector('[id^="criteria-container-"]').id.replace('criteria-container-', '');
            toggleEval(btnEval, actId);
        } else if (btnAddCrit) {
            const actDOMId = btnAddCrit.closest('[id^="criteria-container-"]').id;
            showCriteriaDropdown(btnAddCrit, actDOMId, 'OD');
        }
    });

    document.addEventListener('click', e => { 
        if (!e.target.closest('.custom-select-wrapper')) {
            queryAll('.custom-options').forEach(el => { 
                el.classList.remove('open'); 
                if(el.parentElement) el.parentElement.style.zIndex = '1'; 
            }); 
        }
    });

    // Export/Import
    const btnExportPdf = selectEl('btn-export-pdf');
    if (btnExportPdf) btnExportPdf.addEventListener('click', generatePDF);
    const btnExportJson = selectEl('btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', generateJSON);
    const btnClear = selectEl('btn-clear');
    if (btnClear) btnClear.addEventListener('click', clearState);
    setupFileManager();
    
    try {
        setupCloudIntegration();
    } catch (e) {
        console.warn("ClickSA: Cloud initialization error:", e);
    }
    
    // Modal controls
    const btnCloseExport = selectEl('btn-close-export');
    if (btnCloseExport) btnCloseExport.addEventListener('click', () => selectEl('export-modal').classList.remove('show'));
    const btnOpenExport = selectEl('btn-open-export');
    if (btnOpenExport) btnOpenExport.addEventListener('click', () => selectEl('export-modal').classList.add('show'));
});

function setupTooltipListeners() {
    const tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    document.body.appendChild(tooltip);

    const container = selectEl('perfil-eixida-container');
    if (!container) return;

    container.addEventListener('mouseover', e => {
        const cell = e.target.closest('.cc-cell');
        if (cell && cell.dataset.fulltext) {
            tooltip.innerHTML = `<strong>${cell.dataset.desc}</strong><br><span style="font-weight:normal; font-size:0.8rem; display:block; margin-top:4px;">${cell.dataset.fulltext}</span>`;
            tooltip.classList.add('show');
        }
    });

    container.addEventListener('mousemove', e => {
        if (tooltip.classList.contains('show')) {
            let x = e.pageX + 15, y = e.pageY + 15;
            if (x + 280 > window.innerWidth) x = e.pageX - 295;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }
    });

    container.addEventListener('mouseout', e => { if (e.target.closest('.cc-cell')) tooltip.classList.remove('show'); });
    
    container.addEventListener('click', e => {
        const cell = e.target.closest('.cc-cell');
        if (cell) { 
            cell.classList.toggle('manual-active'); 
            updateCellVisual(cell); 
            recalcularTotaLaCadena(); 
            saveState();
        }
    });
}


function setupFileManager() {
    const uploadTrigger = document.getElementById('upload-trigger');
    const fileUpload = document.getElementById('file-upload');
    const fileList = document.getElementById('file-list');
    if (!uploadTrigger || !fileUpload || !fileList) return;

    uploadTrigger.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', handleFiles);

    renderSAs();

    function handleFiles(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        let SAs = getSessionSAs();

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const content = JSON.parse(evt.target.result);
                    if (content) {
                        content.filename = file.name;
                        content.saNum = (content.inputs && content.inputs['input-sa-num']) ? content.inputs['input-sa-num'] : '?';
                        const existingIdx = SAs.findIndex(s => s.filename === file.name);
                        if (existingIdx >= 0) SAs[existingIdx] = content;
                        else SAs.push(content);
                        
                        SAs.sort((a, b) => {
                            let numA = parseInt(a.saNum, 10);
                            let numB = parseInt(b.saNum, 10);
                            if (isNaN(numA)) numA = 9999;
                            if (isNaN(numB)) numB = 9999;
                            return numA - numB;
                        });
                        
                        saveSessionSAs(SAs);
                        renderSAs();
                    }
                } catch(e) {}
            };
            reader.readAsText(file);
        });
        event.target.value = '';
    }

    function renderSAs() {
        const SAs = getSessionSAs();
        fileList.innerHTML = '';
        if(SAs.length === 0) return;
        
        SAs.forEach(sa => {
            const square = document.createElement('div');
            square.className = 'file-square';
            square.innerHTML = `
                <div class="file-square-del" title="Eliminar SA"><i class="fa-solid fa-xmark"></i></div>
                <i class="fa-solid fa-file-lines"></i>
                <div class="file-square-text">SA</div>
                <div class="file-square-num">${sa.saNum}</div>
            `;
            
            square.addEventListener('click', (e) => {
                e.stopPropagation();
                loadSAIntoEditor(sa);
            });
            
            square.querySelector('.file-square-del').addEventListener('click', (e) => {
                e.stopPropagation();
                const currentSAs = getSessionSAs();
                saveSessionSAs(currentSAs.filter(s => s.filename !== sa.filename));
                renderSAs();
            });
            
            fileList.appendChild(square);
        });
    }

    function getSessionSAs() {
        try {
            const str = sessionStorage.getItem('dashboard_SAs');
            const parsed = str ? JSON.parse(str) : [];
            return Array.isArray(parsed) ? parsed.filter(s => s && typeof s === 'object') : [];
        } catch(e) {
            return [];
        }
    }
    function saveSessionSAs(sas) {
        try { sessionStorage.setItem('dashboard_SAs', JSON.stringify(sas)); } catch(e) {}
    }
    
    function loadSAIntoEditor(sa) {
        sa.inputs = sa.inputs || {};
        sa.selects = sa.selects || {};
        sa.tags = sa.tags || {};
        sa.destinataris = sa.destinataris || [];
        sa.sequence = sa.sequence || [];
        sa.temporalitzacio = sa.temporalitzacio || [];
        
        try {
            localStorage.setItem('clickSA_state', JSON.stringify(sa));
            sessionStorage.setItem('editing_filename', sa.filename);
        } catch(e) {}
        window.location.reload();
    }
}

export function showToast(message, type = 'success') {
    const container = selectEl('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    let icon = 'fa-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    else if (type === 'info') icon = 'fa-circle-info';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function setupCloudIntegration() {
    try {
        initSupabase();
    } catch (e) {
        console.warn("Supabase init error:", e);
    }

    const authModal = selectEl('auth-modal');
    const cloudLibModal = selectEl('cloud-library-modal');
    const btnAuth = selectEl('btn-auth');
    const btnCloud = selectEl('btn-cloud');
    const btnCloudSave = selectEl('btn-cloud-save');
    const btnCloseAuth = selectEl('btn-close-auth');
    const btnCloseCloudLib = selectEl('btn-close-cloud-lib');
    const authAlert = selectEl('auth-alert');
    const authForm = selectEl('auth-form');
    const btnAuthSubmit = selectEl('btn-auth-submit');
    const btnAuthGoogle = selectEl('btn-auth-google');
    const btnAuthSignout = selectEl('btn-auth-signout');
    const btnAuthOpenLib = selectEl('btn-auth-open-lib');
    const authHeaderTitle = selectEl('auth-header-title');
    const authSubmitText = selectEl('auth-submit-text');
    const authSwitchPrompt = selectEl('auth-switch-prompt');
    const authSwitchLink = selectEl('auth-switch-link');
    const authForgotLink = selectEl('auth-forgot-link');
    const authPassGroup = selectEl('auth-pass-group');

    const cloudSaList = selectEl('cloud-sa-list');
    const cloudSearchInput = selectEl('cloud-search-input');
    const btnRefreshCloudLib = selectEl('btn-refresh-cloud-lib');
    const btnSaveAsNewCloud = selectEl('btn-save-as-new-cloud');

    let currentAuthMode = 'signin';
    let cachedCloudSAs = [];

    function setAuthAlert(msg, type = 'error') {
        if (!authAlert) return;
        if (!msg) {
            authAlert.style.display = 'none';
            authAlert.className = 'auth-alert';
            authAlert.innerText = '';
        } else {
            authAlert.className = `auth-alert ${type}`;
            authAlert.innerText = msg;
            authAlert.style.display = 'block';
        }
    }

    function setAuthMode(mode) {
        currentAuthMode = mode;
        setAuthAlert(null);
        if (mode === 'signin') {
            if (authHeaderTitle) authHeaderTitle.innerText = "Iniciar Sessió al Núvol";
            if (authSubmitText) authSubmitText.innerText = "Iniciar Sessió";
            if (authSwitchPrompt) authSwitchPrompt.innerText = "No tens compte?";
            if (authSwitchLink) authSwitchLink.innerText = "Crear compte";
            if (authPassGroup) authPassGroup.style.display = "flex";
            if (authForgotLink) authForgotLink.style.display = "inline";
        } else if (mode === 'signup') {
            if (authHeaderTitle) authHeaderTitle.innerText = "Crear Compte al Núvol";
            if (authSubmitText) authSubmitText.innerText = "Registrar-se";
            if (authSwitchPrompt) authSwitchPrompt.innerText = "Ja tens compte?";
            if (authSwitchLink) authSwitchLink.innerText = "Iniciar sessió";
            if (authPassGroup) authPassGroup.style.display = "flex";
            if (authForgotLink) authForgotLink.style.display = "none";
        } else if (mode === 'reset') {
            if (authHeaderTitle) authHeaderTitle.innerText = "Recuperar Contrasenya";
            if (authSubmitText) authSubmitText.innerText = "Enviar enllaç de recuperació";
            if (authSwitchPrompt) authSwitchPrompt.innerText = "Recordes la contrasenya?";
            if (authSwitchLink) authSwitchLink.innerText = "Tornar a Iniciar Sessió";
            if (authPassGroup) authPassGroup.style.display = "none";
            if (authForgotLink) authForgotLink.style.display = "none";
        }
    }

    if (authSwitchLink) {
        authSwitchLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentAuthMode === 'signin') setAuthMode('signup');
            else setAuthMode('signin');
        });
    }

    if (authForgotLink) {
        authForgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            setAuthMode('reset');
        });
    }

    function updateAuthUI(user) {
        const guestView = selectEl('auth-guest-view');
        const userView = selectEl('auth-user-view');
        const authIcon = selectEl('auth-icon');
        const emailDisplay = selectEl('auth-user-email-display');

        if (user) {
            if (guestView) guestView.style.display = 'none';
            if (userView) userView.style.display = 'block';
            if (btnAuth) {
                btnAuth.classList.add('logged-in');
                btnAuth.title = `Sessió activa: ${user.email}`;
            }
            if (authIcon) authIcon.className = 'fa-solid fa-user-check';
            if (emailDisplay) emailDisplay.innerText = user.email || 'Usuari';
            if (btnCloud) btnCloud.classList.add('active-cloud');
        } else {
            if (guestView) guestView.style.display = 'block';
            if (userView) userView.style.display = 'none';
            if (btnAuth) {
                btnAuth.classList.remove('logged-in');
                btnAuth.title = 'El meu Compte / Iniciar Sessió';
            }
            if (authIcon) authIcon.className = 'fa-solid fa-user';
            if (btnCloud) btnCloud.classList.remove('active-cloud');
        }

        const activeCloudId = getActiveCloudSAId();
        if (btnCloudSave) {
            btnCloudSave.classList.toggle('has-cloud-id', !!activeCloudId);
            if (activeCloudId) {
                btnCloudSave.title = 'Actualitzar la SA al Núvol (Supabase)';
            } else {
                btnCloudSave.title = 'Guardar la SA al Núvol (Supabase)';
            }
        }
    }

    if (btnAuth) btnAuth.addEventListener('click', () => {
        setAuthAlert(null);
        setAuthMode('signin');
        authModal?.classList.add('show');
    });
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => authModal?.classList.remove('show'));

    if (btnCloud) btnCloud.addEventListener('click', async () => {
        const user = await getCurrentUser();
        if (!user) {
            setAuthAlert("Inicia sessió o crea un compte per accedir al teu núvol.", "info");
            setAuthMode('signin');
            authModal?.classList.add('show');
            return;
        }
        openCloudLibrary();
    });
    if (btnCloseCloudLib) btnCloseCloudLib.addEventListener('click', () => cloudLibModal?.classList.remove('show'));

    if (btnAuthOpenLib) btnAuthOpenLib.addEventListener('click', () => {
        authModal?.classList.remove('show');
        openCloudLibrary();
    });

    [authModal, cloudLibModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('show');
            });
        }
    });

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = selectEl('auth-email')?.value.trim();
            const password = selectEl('auth-password')?.value;
            setAuthAlert(null);

            if (!email) {
                setAuthAlert("Introdueix un correu electrònic vàlid.");
                return;
            }

            const btn = btnAuthSubmit;
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processant...';
                btn.disabled = true;
            }

            try {
                if (currentAuthMode === 'signin') {
                    if (!password) throw new Error("Has d'introduir la contrasenya.");
                    await signInWithEmail(email, password);
                    authModal?.classList.remove('show');
                    showToast("Sessió iniciada correctament!", "success");
                } else if (currentAuthMode === 'signup') {
                    if (!password || password.length < 6) throw new Error("La contrasenya ha de tenir com a mínim 6 caràcters.");
                    await signUpWithEmail(email, password);
                    setAuthAlert("Compte creat! Comprova el teu correu electrònic per confirmar-lo si cal.", "success");
                    showToast("Compte creat correctament!", "success");
                } else if (currentAuthMode === 'reset') {
                    await resetPassword(email);
                    setAuthAlert("Hem enviat un enllaç de restabliment al teu correu.", "success");
                }
            } catch (err) {
                console.error("Auth error", err);
                let msg = err.message || "Error en el procés d'autenticació.";
                if (msg.includes("Invalid login credentials")) msg = "Correu electrònic o contrasenya incorrectes.";
                if (msg.includes("User already registered")) msg = "Aquest correu ja està registrat. Tria 'Iniciar Sessió'.";
                if (msg.includes("Password should be")) msg = "La contrasenya ha de tenir almenys 6 caràcters.";
                setAuthAlert(msg, "error");
            } finally {
                if (btn) {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            }
        });
    }

    if (btnAuthGoogle) {
        btnAuthGoogle.addEventListener('click', async () => {
            try {
                await signInWithGoogle();
            } catch (err) {
                console.error("Google Auth error", err);
                setAuthAlert(err.message || "No s'ha pogut connectar amb Google.", "error");
            }
        });
    }

    if (btnAuthSignout) {
        btnAuthSignout.addEventListener('click', async () => {
            if (confirm("Vols tancar la sessió?")) {
                await signOutUser();
                authModal?.classList.remove('show');
                showToast("Sessió tancada.", "info");
            }
        });
    }

    async function handleSaveCloud(asNew = false) {
        const user = await getCurrentUser();
        if (!user) {
            setAuthAlert("Inicia sessió per desar les teues Situacions d'Aprenentatge al núvol.", "info");
            setAuthMode('signin');
            authModal?.classList.add('show');
            return;
        }

        const state = getStateObject();
        const btn = btnCloudSave;
        const originalHtml = btn?.innerHTML;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const res = await saveSAToCloud(state, asNew);
            const msg = res.isUpdate 
                ? `Actualitzada al núvol: "${res.title}"` 
                : `Desada al núvol com a nova: "${res.title}"`;
            showToast(msg, "success");
            updateAuthUI(user);
        } catch (err) {
            console.error("Save cloud error", err);
            showToast(err.message || "Error desant al núvol.", "error");
        } finally {
            if (btn) btn.innerHTML = originalHtml;
        }
    }

    if (btnCloudSave) btnCloudSave.addEventListener('click', () => handleSaveCloud(false));
    if (btnSaveAsNewCloud) btnSaveAsNewCloud.addEventListener('click', () => {
        handleSaveCloud(true);
        cloudLibModal?.classList.remove('show');
    });

    async function openCloudLibrary() {
        cloudLibModal?.classList.add('show');
        await loadAndRenderCloudList();
    }

    async function loadAndRenderCloudList() {
        if (!cloudSaList) return;
        cloudSaList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 10px;">Carregant les teues SA des de Supabase...</p>
            </div>`;

        try {
            cachedCloudSAs = await fetchUserSAs();
            renderCloudSAs(cachedCloudSAs);
        } catch (err) {
            console.error("Fetch SAs error", err);
            cloudSaList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #C68B87;">
                    <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
                    <p style="margin-top: 10px;">Error carregant les SA: ${err.message}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">Has executat el fitxer 'supabase/schema.sql' al teu projecte de Supabase?</p>
                </div>`;
        }
    }

    function renderCloudSAs(list) {
        if (!cloudSaList) return;
        const countEl = selectEl('cloud-sa-count');
        if (countEl) countEl.innerText = `${list.length} Situacio${list.length === 1 ? '' : 'ns'} d'Aprenentatge`;

        const query = cloudSearchInput?.value.trim().toLowerCase() || '';
        const filtered = list.filter(sa => {
            const fullStr = `${sa.sa_num} ${sa.title} ${sa.area} ${sa.cicle} ${sa.curs}`.toLowerCase();
            return fullStr.includes(query);
        });

        if (filtered.length === 0) {
            cloudSaList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-cloud-arrow-up fa-2x" style="opacity: 0.5;"></i>
                    <p style="margin-top: 10px; font-weight: 600;">${list.length === 0 ? "Encara no tens cap SA desada al núvol." : "No s'ha trobat cap SA amb aquest filtre."}</p>
                    <p style="font-size: 0.85rem; margin-top: 4px;">Prem el botó 'Desar l'actual com a nova' per desar el teu document de treball.</p>
                </div>`;
            return;
        }

        const activeId = getActiveCloudSAId();
        cloudSaList.innerHTML = '';

        filtered.forEach(sa => {
            const isCurrent = (activeId === sa.id);
            const card = document.createElement('div');
            card.className = `cloud-sa-card ${isCurrent ? 'is-current' : ''}`;

            const dateStr = sa.updated_at ? new Date(sa.updated_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            card.innerHTML = `
                <div class="cloud-sa-left">
                    <div class="cloud-sa-badge">
                        <span>${sa.sa_num || '?'}</span>
                        <small>SA</small>
                    </div>
                    <div class="cloud-sa-details">
                        <div class="cloud-sa-title" title="${sa.title || 'Sense títol'}">
                            ${isCurrent ? '<i class="fa-solid fa-bookmark" style="color:var(--accent); margin-right:4px;" title="Document actiu"></i>' : ''}
                            ${sa.title || 'Sense títol'}
                        </div>
                        <div class="cloud-sa-meta">
                            ${sa.area ? `<span class="cloud-sa-meta-tag"><i class="fa-solid fa-book"></i> ${sa.area}</span>` : ''}
                            ${sa.cicle ? `<span class="cloud-sa-meta-tag">${sa.cicle}</span>` : ''}
                            ${sa.curs ? `<span class="cloud-sa-meta-tag">${sa.curs}</span>` : ''}
                            <span style="font-size: 0.7rem; opacity: 0.7; margin-left: 4px;"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                        </div>
                    </div>
                </div>
                <div class="cloud-sa-actions">
                    <button class="cloud-act-btn cloud-act-open" title="Carregar a l'editor"><i class="fa-solid fa-folder-open"></i> Obrir</button>
                    <button class="cloud-act-btn cloud-act-del" title="Eliminar del núvol"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            card.querySelector('.cloud-act-open').addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const fullSA = await fetchSAById(sa.id);
                    if (fullSA && fullSA.data) {
                        localStorage.setItem('clickSA_state', JSON.stringify(fullSA.data));
                        setActiveCloudSAId(sa.id);
                        showToast(`Carregada "${sa.title}" des del núvol!`, "success");
                        cloudLibModal?.classList.remove('show');
                        setTimeout(() => location.reload(), 400);
                    }
                } catch (err) {
                    alert("Error obrint la SA: " + err.message);
                }
            });

            card.querySelector('.cloud-act-del').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Estàs segur que vols eliminar del núvol la Situació d'Aprenentatge "${sa.title}"? Aquesta acció no es pot desfer.`)) {
                    try {
                        await deleteSAFromCloud(sa.id);
                        showToast("Eliminada del núvol correctament.", "info");
                        cachedCloudSAs = cachedCloudSAs.filter(item => item.id !== sa.id);
                        renderCloudSAs(cachedCloudSAs);
                        getCurrentUser().then(u => updateAuthUI(u));
                    } catch (err) {
                        alert("Error eliminant la SA: " + err.message);
                    }
                }
            });

            cloudSaList.appendChild(card);
        });
    }

    if (cloudSearchInput) {
        cloudSearchInput.addEventListener('input', () => {
            renderCloudSAs(cachedCloudSAs);
        });
    }

    if (btnRefreshCloudLib) {
        btnRefreshCloudLib.addEventListener('click', () => {
            loadAndRenderCloudList();
        });
    }

    try {
        onAuthStateChange((event, session) => {
            updateAuthUI(session?.user || null);
        });
    } catch (e) {}

    try {
        getCurrentUser().then(user => {
            updateAuthUI(user);
        }).catch(() => {});
    } catch (e) {}
}
