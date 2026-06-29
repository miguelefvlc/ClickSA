import { selectEl, queryAll } from './utils.js';
import { getStateObject } from './state.js';

const isBlockDisabled = (blockNum) => {
    const container = selectEl(`container-block-${blockNum}`);
    return container && container.classList.contains('disabled-block');
};

export function generatePDF() {
    const state = getStateObject();
    const activeCCs = Array.from(queryAll('.cc-cell.active')).map(c => c.dataset.desc);

    const formatTagsList = (tagsArray) => tagsArray && tagsArray.length > 0 ? { ul: tagsArray, margin: [0, 4, 0, 4], alignment: 'justify' } : { text: '-', margin: [4, 4, 4, 4], alignment: 'center' };
    const val = (key) => state.inputs[key] || state.selects[key] || '-';

    const formatSmartTagsList = (tagsArray, type) => {
        if (!tagsArray || tagsArray.length === 0) return { text: '-', margin: [4, 4, 4, 4], alignment: 'center' };
        let ul = tagsArray.map(str => {
            let boldPart = "", restPart = str;
            const regMap = {
                'ODS': /^(ODS\s*\d+)(.*)/i, 'OBJ': /^([a-z]\))(.*)/i, 'CE': /^(CE\s*\d+)(.*)/i,
                'CA': /^(CA\s*\d+\.\d+)(.*)/i, 'BL': /^(BL\s*\d+)(.*)/i, 'Saber': /^([A-ZÀ-Ö0-9.\/-]+\s*\d+(?:\.\d+)?)(.*)/i,
                'OD': /^(.*?)\s+-\s+(.*)/i
            };
            let m = regMap[type] ? str.match(regMap[type]) : null;
            if (m) { 
                if (type === 'OD') {
                    return { text: [ { text: m[1], bold: true }, ` - ${m[2]}` ] };
                }
                boldPart = m[1]; restPart = m[2]; 
            }
            return boldPart ? { text: [ { text: boldPart, bold: true }, restPart ] } : { text: str };
        });
        return { ul: ul, margin: [0, 4, 0, 4], alignment: 'justify' };
    };

    const standardTableLayout = {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#D5E0E0', vLineColor: () => '#D5E0E0',
        paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4
    };

    const buildSectionTitle = (num, title) => ({
        table: {
            widths: [24, '*'], 
            body: [
                [
                    { text: num, fillColor: '#6B9596', color: '#FFFFFF', bold: true, alignment: 'center', margin: [0, 4, 0, 4], fontSize: 12 },
                    { text: title.toUpperCase(), color: '#2B3A3B', bold: true, margin: [6, 5, 0, 3], fontSize: 10 }
                ]
            ]
        },
        layout: { hLineWidth: (i, node) => (i === node.table.body.length) ? 0.5 : 0, vLineWidth: () => 0, hLineColor: () => '#D5E0E0', paddingBottom: () => 6 },
        margin: [0, 15, 0, 8] 
    });

    const buildSubSectionTitle = (title) => ({
        table: { widths: ['100%'], body: [[ { text: title, style: 'th' } ]] },
        layout: standardTableLayout, margin: [0, 8, 0, 4]
    });

    const buildTemporalitzacio = () => {
        const headerRow = ['SET', 'OCT', 'NOV', 'DES', 'GEN', 'FEB', 'MAR', 'ABR', 'MAI', 'JUN'].map(m => ({ text: m, colSpan: 4, style: 'thCenter', fontSize: 7 })).flatMap(m => [m, {}, {}, {}]);
        const weeksRow = Array.from({length: 40}).map((_, i) => ({ text: '', fillColor: state.temporalitzacio && state.temporalitzacio[i] ? '#6B9596' : '#FFFFFF', margin: [0, 4, 0, 4] }));
        return { table: { widths: Array(40).fill('*'), body: [ headerRow, weeksRow ] }, layout: standardTableLayout, margin: [0, 2, 0, 2] };
    };

    const buildPerfilEixidaSingleTable = () => {
        const ccGroups = [ { id: 'CCL', count: 5 }, { id: 'CP', count: 3 }, { id: 'STEM', count: 5 }, { id: 'CD', count: 5 }, { id: 'CPSAA', count: 5 }, { id: 'CC', count: 4 }, { id: 'CE', count: 3 }, { id: 'CCEC', count: 4 } ];
        const headerRow = [], cellsRow = [];
        ccGroups.forEach(group => {
            headerRow.push({ text: group.id, colSpan: group.count, style: 'thCenter', fontSize: 7 });
            for(let i=1; i<group.count; i++) headerRow.push({});
            for(let i=1; i<=group.count; i++) {
                const isActive = activeCCs.includes(`${group.id}${i}`);
                cellsRow.push({ text: i.toString(), alignment: 'center', fontSize: 7, bold: isActive, color: isActive ? '#FFFFFF' : '#3A4B4C', fillColor: isActive ? '#6B9596' : '#FFFFFF', margin: [0, 2, 0, 2] });
            }
        });
        return { table: { widths: Array(34).fill('*'), body: [headerRow, cellsRow] }, layout: standardTableLayout, margin: [0, 2, 0, 2] };
    };

    const buildMesuresEspecifiques = () => {
        let content = [];
        if (state.mesuresActives && state.destinataris && state.destinataris.length > 0) {
            state.destinataris.forEach((dest, index) => {
                let destName = dest.tags['dest'] && dest.tags['dest'].length > 0 ? dest.tags['dest'].join(', ') : `Destinatari ${index+1}`;
                content.push({ table: { widths: ['100%'], body: [[{ text: `Destinatari ${index+1}: ${destName}`, style: 'th', fillColor: '#E6EDED' }]] }, layout: standardTableLayout, margin: [0, 0, 0, 2] });
                content.push({
                    table: {
                        widths: ['33.3%', '33.3%', '33.4%'],
                        body: [
                            [{ text: 'NIVELL III', colSpan: 3, style: 'thCenter', fontSize: 8, fillColor: '#F8FAFA' }, {}, {}],
                            [{ text: 'Accés', style: 'thCenter' }, { text: 'Aprenentatge', style: 'thCenter' }, { text: 'Participació', style: 'thCenter' }],
                            [ formatTagsList(dest.tags['n3-acc']), formatTagsList(dest.tags['n3-apr']), formatTagsList(dest.tags['n3-par']) ]
                        ]
                    },
                    layout: standardTableLayout, margin: [0, 0, 0, 2]
                });
                content.push({
                    table: {
                        widths: ['25%', '25%', '25%', '25%'],
                        body: [
                            [{ text: 'NIVELL IV', colSpan: 4, style: 'thCenter', fontSize: 8, fillColor: '#F8FAFA' }, {}, {}, {}],
                            [{ text: 'Recursos Personals', style: 'thCenter' }, { text: 'Accés', style: 'thCenter' }, { text: 'Aprenentatge', style: 'thCenter' }, { text: 'Participació', style: 'thCenter' }],
                            [ formatTagsList(dest.tags['n4-rec']), formatTagsList(dest.tags['n4-acc']), formatTagsList(dest.tags['n4-apr']), formatTagsList(dest.tags['n4-par']) ]
                        ]
                    },
                    layout: standardTableLayout, margin: [0, 0, 0, 10]
                });
            });
        } else {
            content.push({ text: 'No s\'han establert mesures específiques addicionals.', italics: true, color: '#788F90', margin: [0, 4, 0, 10] });
        }
        return content;
    };

    const buildSequenceTableBody = () => {
        if (!state.sequence || state.sequence.length === 0) return [[{ text: 'Sense dades a la seqüència.', colSpan: 2, color: '#788F90', italics: true, margin: [6,6,6,6], alignment: 'center' }, {}]];
        let body = [], globalSessionCount = 1; 

        state.sequence.forEach((step, index) => {
            body.push([{ text: `FASE ${index + 1}: ${step.title || 'Sense títol'}`, style: 'th', colSpan: 2 }, {}]);
            let activitiesList = step.activities.map(act => {
                let evalText = '';
                if (act.evalActive && act.criteria.length) {
                    let critShort = act.criteria.map(c => {
                         let m = c.match(/^(.*?)\s+-/);
                         if (m) return m[1];
                         let m2 = c.match(/^CA\s*\d+(?:\.\d+)?/i);
                         return m2 ? m2[0] : c;
                    }).join(', ');
                    evalText = ` [Avaluació: ${critShort}]`;
                }
                return { text: [act.text, { text: evalText, color: '#6B9596', italics: true, fontSize: 8 }], alignment: 'justify' };
            });
            
            let sessionBoxes = step.sessions > 0 ? Array.from({length: step.sessions}).map(() => [{ text: (globalSessionCount++).toString(), alignment: 'center', fillColor: '#E6EDED', color: '#2B3A3B', bold: true, margin: [0,2,0,2] }]) : [[{ text: '-', alignment: 'center', color: '#788F90' }]];

            body.push([
                { ul: activitiesList.length > 0 ? activitiesList : ['Sense activitats'], margin: [6, 6, 6, 6], fontSize: 9 },
                { table: { widths: ['*'], body: [ [{ text: 'Sessió', style: 'thCenter', fontSize: 7 }] ].concat(sessionBoxes) }, layout: standardTableLayout, alignment: 'center', margin: [0, 2, 0, 2] }
            ]);
        });
        return body;
    };

    const docContent = [
        { text: `SITUACIÓ D'APRENENTATGE Nº ${val('input-sa-num')}: ${val('input-sa-title').toUpperCase()}`, style: 'header' }
    ];

    let sectionNum = 1;

    if (!isBlockDisabled(1)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Identificació i Context'));
        docContent.push({ table: { widths: ['10%', '25%', '10%', '15%', '10%', '10%', '10%', '10%'], body: [[{text:'Àrea', style:'th'}, val('input-area'), {text:'Cicle', style:'th'}, val('input-cicle'), {text:'Nivell', style:'th'}, val('input-curs'), {text:'Trim.', style:'th'}, val('input-trimestre')]] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['100%'], body: [[{text: 'TEMPORALITZACIÓ', style: 'thCenter'}], [buildTemporalitzacio()]] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['75%', '25%'], body: [ [{text: 'Repte, Problema, Necessitat', style: 'th'}, {text: 'ODS', style: 'thCenter'}], [{text: val('input-repte'), margin: [4,4,4,4]}, Object.assign({}, formatSmartTagsList(state.tags['tags-ods'], 'ODS'), { rowSpan: 3 })], [{text: 'Producte Final', style: 'th'}, ''], [{text: val('input-tasca'), margin: [4,4,4,4]}, ''] ] }, layout: standardTableLayout });
        sectionNum++;
    }

    if (!isBlockDisabled(2)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Concreció Curricular'));
        docContent.push({ table: { widths: ['100%'], body: [[{text:'Objectius Generals d\'Etapa', style:'th'}], [formatSmartTagsList(state.tags['tags-obj-gen'], 'OBJ')]] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['100%'], body: [[{text:'Perfil d\'Eixida (Descriptors Operatius)', style:'thCenter'}], [buildPerfilEixidaSingleTable()]] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['50%', '50%'], body: [ [{text:'Competències Específiques', style:'th'}, {text:'Criteris d\'Avaluació', style:'th'}], [formatSmartTagsList(state.tags['tags-comp-espec'], 'CE'), formatSmartTagsList(state.tags['tags-criteris'], 'CA')] ] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['25%', '75%'], body: [ [{text:'Blocs de Continguts', style:'th'}, {text:'Sabers Bàsics', style:'th'}], [formatSmartTagsList(state.tags['tags-blocs'], 'BL'), formatSmartTagsList(state.tags['tags-sabers'], 'Saber')] ] }, layout: standardTableLayout, margin: [0, 0, 0, 8] });
        docContent.push({ table: { widths: ['100%'], body: [[{text:'Objectius Didàctics', style:'thCenter'}], [formatSmartTagsList(state.tags['tags-od'], 'OD')]] }, layout: standardTableLayout });
        sectionNum++;
    }

    if (!isBlockDisabled(3)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Metodologia i Organització'));
        docContent.push({ table: { widths: ['33%', '33%', '34%'], body: [ [{text:'Metodologia / Model / Estil', style:'th'}, {text:'Agrupaments', style:'th'}, {text:'Espais i Recursos Materials', style:'th'}], [formatTagsList(state.tags['tags-metodologia']), formatTagsList(state.tags['tags-agrupaments']), { text: val('input-materials'), margin: [4,4,4,4], alignment: 'justify' }] ] }, layout: standardTableLayout });
        sectionNum++;
    }

    if (!isBlockDisabled(4)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Avaluació'));
        docContent.push({ table: { widths: ['50%', '50%'], body: [ [{text:'Instruments d\'Avaluació', style:'th'}, {text:'Tipus d\'Avaluació', style:'th'}], [formatTagsList(state.tags['tags-instruments']), formatTagsList(state.tags['tags-tipus-avaluacio'])] ] }, layout: standardTableLayout });
        sectionNum++;
    }

    if (!isBlockDisabled(5)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Mesures per a l\'atenció educativa'));
        docContent.push(buildSubSectionTitle('Disseny universal per a l\'aprenentatge (DUA)'));
        docContent.push({ table: { widths: ['33%', '33%', '34%'], body: [ [{text:'Representació', style:'thCenter'}, {text:'Motivació', style:'thCenter'}, {text:'Acció', style:'thCenter'}], [formatTagsList(state.tags['tags-dua-acces']), formatTagsList(state.tags['tags-dua-part']), formatTagsList(state.tags['tags-dua-prog'])] ] }, layout: standardTableLayout, margin: [0, 0, 0, 10] });
        docContent.push(buildSubSectionTitle('Mesures específiques de resposta'));
        docContent.push(...buildMesuresEspecifiques());
        sectionNum++;
    }

    if (!isBlockDisabled(6)) {
        docContent.push(buildSectionTitle(sectionNum.toString(), 'Seqüència Didàctica'));
        docContent.push({ table: { widths: ['*', 40], body: buildSequenceTableBody() }, layout: standardTableLayout });
        sectionNum++;
    }

    const docDefinition = {
        pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [30, 30, 30, 30],
        defaultStyle: { font: 'Roboto', fontSize: 9, color: '#3A4B4C', alignment: 'justify' }, 
        styles: { header: { fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 10], color: '#2B3A3B' }, th: { bold: true, fillColor: '#F2F5F5', color: '#2B3A3B' }, thCenter: { bold: true, fillColor: '#F2F5F5', color: '#2B3A3B', alignment: 'center' } },
        content: docContent
    };

    const saNum = val('input-sa-num') === "-" ? "___" : val('input-sa-num');
    const saTitle = val('input-sa-title') === "-" ? "Sense_titol" : val('input-sa-title');
    
    pdfMake.createPdf(docDefinition).download(`SA_${saNum}_${saTitle.replace(/[\\/:*?"<>|]/g, '')}.pdf`);
}

export function generateJSON() {
    const state = getStateObject();
    const saNum = selectEl('input-sa-num')?.value || "___", saTitle = selectEl('input-sa-title')?.value || "Sense_titol";
    const link = Object.assign(document.createElement('a'), { href: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2)), download: `SA_${saNum}_${saTitle.replace(/[\\/:*?"<>|]/g, '')}.json` });
    document.body.appendChild(link); link.click(); link.remove();
}

export function importJSON(e) {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const content = JSON.parse(evt.target.result);
            if(!content.inputs || !content.selects || !content.tags) throw new Error();
            localStorage.setItem('clickSA_state', JSON.stringify(content)); location.reload();
        } catch (err) { alert("❌ El fitxer seleccionat no és un document vàlid de ClickSA."); }
    };
    reader.readAsText(e.target.files[0]); e.target.value = '';
}
