const TAL = {
    protocol: { 
        id: 'protocol', 
        name: 'Protokol Ayarları', 
        type: 'protocol', 
        fields: [], 
        crcType: 'NONE', 
        crcSize: 0, 
        comment: '',
        config: {
            framing: typeof TALFraming !== 'undefined' ? TALFraming.defaultFraming() : null
        }
    },
    enums: [],
    structs: [],
    messages: []
};

let headerElements = [
    { tag: "Field", role: "sync", type: "uint", size: 1 },
    { tag: "Field", role: "sender", type: "uint", size: 1 },
    { tag: "Field", role: "destination", type: "uint", size: 1 },
    { tag: "Field", role: "payloadSize", type: "uint", size: 2 }
];

let currentViewType = null;
let currentViewId = null;
let selectedItemIndex = null;
let currentSettingsSection = 'general';

// Hash Routing
function updateHash(hash) {
    window.location.hash = hash;
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    
    if (!hash) {
        showExplorer(false);
        return;
    }
    
    if (hash === 'explorer') {
        showExplorer(false);
    } else if (hash === 'protocol') {
        loadView('protocol', 'protocol', false);
    } else if (hash === 'message') {
        loadView('protocol', 'protocol', false);
        showSettingsSection('header');
    } else if (hash.startsWith('enum:')) {
        const id = hash.split(':')[1];
        loadView('enum', id, false);
    } else if (hash.startsWith('struct:')) {
        const id = hash.split(':')[1];
        loadView('struct', id, false);
    } else if (hash.startsWith('message-')) {
        const id = hash.split('-')[1];
        loadView('message', id, false);
    }
}

function showExplorer(updateHashFlag = true) {
    currentSettingsSection = 'general';
    
    if (updateHashFlag) {
        updateHash('explorer');
    }
    
    document.getElementById('settings-sidebar').style.display = 'none';
    document.getElementById('settings-content').style.display = 'none';
    
    document.getElementById('sidebar-left').style.display = 'flex';
    document.getElementById('sidebar-right').style.display = 'block';
    
    document.getElementById('view-title').innerText = "Seçili Öğe Yok";
    document.getElementById('enum-toolbar').style.display = 'none';
    document.getElementById('struct-toolbar').style.display = 'none';
    document.getElementById('protocol-crc-toolbar').style.display = 'none';
    document.getElementById('protocol-framing-toolbar').style.display = 'none';
    document.getElementById('enum-view-container').style.display = 'none';
    document.getElementById('memory-map-container').style.display = 'none';
    document.getElementById('delete-element-btn').style.display = 'none';
    document.getElementById('properties-panel').style.display = 'none';
    
    currentViewType = null;
    currentViewId = null;
    selectedItemIndex = null;
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('hashchange', handleHashChange);

    document.addEventListener('keydown', (event) => {
        const modalOpen = document.getElementById('modal-overlay').style.display === 'flex';
        if (event.key === 'Escape' && currentViewType === 'protocol' && !modalOpen) {
            showExplorer();
        }
    });
    
    HeaderTable();

    const hash = window.location.hash.substring(1);
    if (!hash) {
        showExplorer(false);
    } else {
        handleHashChange();
    }
});

function generateUUID() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
}

let _modalCallback = null;render
let _modalCancelCallback = null;

function showPrompt(message, callback, defaultVal = '') {
    document.getElementById('modal-message').innerText = message;
    const inp = document.getElementById('modal-input');
    inp.style.display = 'block';
    inp.value = defaultVal;
    document.getElementById('modal-select').style.display = 'none';
    document.getElementById('modal-cancel').style.display = 'block';
    _modalCallback = () => callback(inp.value.trim());
    _modalCancelCallback = () => callback(null);
    document.getElementById('modal-overlay').style.display = 'flex';
    setTimeout(() => inp.focus(), 50);
}

function showSelect(message, options, callback) {
    document.getElementById('modal-message').innerText = message;
    document.getElementById('modal-input').style.display = 'none';
    const sel = document.getElementById('modal-select');
    sel.style.display = 'block';
    sel.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    document.getElementById('modal-cancel').style.display = 'block';
    _modalCallback = () => callback(sel.value);
    _modalCancelCallback = () => callback(null);
    document.getElementById('modal-overlay').style.display = 'flex';
}

function showConfirm(message, callback) {
    document.getElementById('modal-message').innerText = message;
    document.getElementById('modal-input').style.display = 'none';
    document.getElementById('modal-select').style.display = 'none';
    document.getElementById('modal-cancel').style.display = 'block';
    _modalCallback = () => callback(true);
    _modalCancelCallback = () => callback(false);
    document.getElementById('modal-overlay').style.display = 'flex';
}

function showAlert(message) {
    document.getElementById('modal-message').innerText = message;
    document.getElementById('modal-input').style.display = 'none';
    document.getElementById('modal-select').style.display = 'none';
    document.getElementById('modal-cancel').style.display = 'none';
    _modalCallback = () => { document.getElementById('modal-cancel').style.display = 'block'; };
    _modalCancelCallback = () => { document.getElementById('modal-cancel').style.display = 'block'; };
    document.getElementById('modal-overlay').style.display = 'flex';
}

function modalOk() {
    document.getElementById('modal-overlay').style.display = 'none';
    const cb = _modalCallback;
    _modalCallback = null;
    _modalCancelCallback = null;
    if (cb) cb();
}

function modalCancel() {
    document.getElementById('modal-overlay').style.display = 'none';
    const cb = _modalCancelCallback;
    _modalCallback = null;
    _modalCancelCallback = null;
    if (cb) cb();
}

document.addEventListener('keydown', e => {
    if (document.getElementById('modal-overlay').style.display !== 'none') {
        if (e.key === 'Enter') modalOk();
        if (e.key === 'Escape') modalCancel();
    }
});

const dragCounters = { enum: 0, struct: 0, message: 0 };

function isValidCppIdentifier(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function isNameUnique(collection, name, excludeId = null) {
    return !collection.some(item => item.name === name && item.id !== excludeId);
}

function isFieldNameUnique(obj, name, excludeId = null) {
    return !obj.fields.filter(f => !f.isSpare).some(f => f.name === name && f.id !== excludeId);
}

function createNew(type) {
    showPrompt(`Yeni ${type} adı:`, name => {
        if (!name) return;
        if (!isValidCppIdentifier(name)) {
            alert(`"${name}" geçerli bir C++ tanımlayıcısı değil.`);
            return;
        }
        const allTop = [...TAL.enums, ...TAL.structs, ...TAL.messages];
        if (!isNameUnique(allTop, name)) { alert(`"${name}" adı zaten kullanımda.`); return; }

        if (type === 'enum') {
            showSelect('Enum boyutu seçin:', [
                { value: '8', label: '8 bit' },
                { value: '16', label: '16 bit' },
                { value: '32', label: '32 bit' }
            ], size => {
                if (!size) return;
                const id = Date.now().toString();
                const newItem = { id, name, type, comment: '', size: parseInt(size), items: [] };
                TAL.enums.push(newItem);
                renderList();
                loadView(type, id);
            });
        } else {
            const id = Date.now().toString();
            const newItem = { id, name, type, comment: '', fields: [] };
            if (type === 'struct') TAL.structs.push(newItem);
            else if (type === 'message') {
                TAL.messages.push(newItem);
                syncProtocolToMessages();
            }
            renderList();
            loadView(type, id);
        }
    });
}

function renderList() {
    const enumList = document.getElementById('enum-list');
    const structList = document.getElementById('struct-list');
    const messageList = document.getElementById('message-list');
    
    if (enumList) enumList.innerHTML = '';
    if (structList) structList.innerHTML = '';
    if (messageList) messageList.innerHTML = '';
    
    const appendItems = (items, container, type) => {
        if (!container) return;
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerText = item.name;
            div.tabIndex = 0; 
            div.onkeydown = (e) => {
                if (e.key === 'Enter') loadView(item.type, item.id);
            };
            div.onclick = () => loadView(item.type, item.id);
            
            if (type === 'enum' || type === 'struct') {
                div.draggable = true;
                div.ondragstart = (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        source: 'sidebar',
                        type: type,
                        id: item.id
                    }));
                };
            }
            
            container.appendChild(div);
        });
    };

    appendItems(TAL.enums, enumList, 'enum');
    appendItems(TAL.structs, structList, 'struct');
    appendItems(TAL.messages, messageList, 'message');
}

function getObjectById(type, id) {
    if (type === 'protocol') return TAL.protocol;
    if (type === 'enum') return TAL.enums.find(x => x.id === id);
    if (type === 'struct') return TAL.structs.find(x => x.id === id);
    if (type === 'message') return TAL.messages.find(x => x.id === id);
    return null;
}

function getCustomTypeName(typeIdStr) {
    if (typeIdStr === 'primitive') return 'primitive';
    const parts = typeIdStr.split('_');
    const obj = getObjectById(parts[0], parts[1]);
    return obj ? obj.name : 'Bilinmeyen / Silinmiş';
}

function getCountFieldName(obj, countFieldId) {
    const field = obj.fields.find(f => f.id === countFieldId);
    return field ? field.name : '';
}

function calculateTypeSize(typeIdStr, visited = new Set()) {
    if (typeIdStr === 'primitive') return 0;
    
    const parts = typeIdStr.split('_');
    const refObj = getObjectById(parts[0], parts[1]);
    if (!refObj) return 0;
    
    if (visited.has(refObj.id)) return 0; 
    visited.add(refObj.id);

    let total = 0;
    if (parts[0] === 'enum') {
        total = refObj.size;
    } else if (parts[0] === 'struct') {
        total = refObj.fields.reduce((acc, f) => {
            if (f.typeId === 'primitive') return acc + f.size;
            return acc + calculateTypeSize(f.typeId, visited);
        }, 0);
    }

    visited.delete(refObj.id);
    return total;
}

function syncAllSizes() {
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
        changed = false;
        [TAL.protocol, ...TAL.structs, ...TAL.messages].forEach(obj => {
            obj.fields.forEach(f => {
                if (f.typeId !== 'primitive') {
                    const parts = f.typeId.split('_');
                    const refObj = getObjectById(parts[0], parts[1]);
                    if (!refObj) {
                        f.typeId = 'primitive';
                        f.comment += ' (UYARI: Referans Silindi)';
                        changed = true;
                    } else {
                        const newSize = calculateTypeSize(f.typeId);
                        if (newSize > 0 && f.size !== newSize) {
                            f.size = newSize;
                            changed = true;
                        }
                    }
                }
            });
            const oldFieldsStr = JSON.stringify(obj.fields);
            rebuildSpares(obj);
            if (JSON.stringify(obj.fields) !== oldFieldsStr) {
                changed = true;
            }
        });
        iterations++;
    }
}

function syncProtocolToMessages() {
    TAL.messages.forEach(msg => {
        msg.fields = msg.fields.filter(f => !f.isHeader && !f.isCrc);
        
        const headerClones = headerElements.map(h => ({
            id: generateUUID(),
            name: h.tag === 'Spare' ? 'spare' : (h.role || 'headerField'),
            size: h.size * 8, 
            typeId: 'primitive',
            comment: h.tag === 'Spare' ? 'Hizalama' : h.role,
            isSpare: h.tag === 'Spare',
            isArray: false,
            countFieldId: '',
            isHeader: true
        }));
        
        const crcFields = [];
        if (TAL.protocol.crcSize > 0) {
            crcFields.push({
                id: generateUUID(), name: TAL.protocol.crcType, size: TAL.protocol.crcSize, 
                typeId: 'primitive', comment: 'Otomatik Checksum/CRC', 
                isSpare: false, isArray: false, countFieldId: '', isCrc: true
            });
        }
        
        msg.fields = [...headerClones, ...msg.fields, ...crcFields];
        rebuildSpares(msg);
    });
    syncAllSizes();
}

function changeCrc() {
    const val = document.getElementById('protocolCrcSelect').value.split('_');
    TAL.protocol.crcType = val[0];
    TAL.protocol.crcSize = parseInt(val[1] || 0);
    syncProtocolToMessages();
    updateByteTable();
}

function readFramingFromForm() {
    if (typeof TALFraming === 'undefined') return {};
    return TALFraming.normalize({
        startMarker: {
            enabled: document.getElementById('framingStartEnabled').checked,
            value: document.getElementById('framingStartValue').value.trim()
        },
        endMarker: {
            enabled: document.getElementById('framingEndEnabled').checked,
            value: document.getElementById('framingEndValue').value.trim()
        },
        byteStuffing: {
            enabled: document.getElementById('framingStuffingEnabled').checked,
            escapeByte: document.getElementById('framingEscapeByte').value.trim(),
            mask: document.getElementById('framingMask').value.trim()
        },
        padding: document.getElementById('framingPadding').value.trim(),
        endianness: document.getElementById('framingEndianness').value,
        maxPayloadSize: document.getElementById('framingMaxPayload').value.trim()
    });
}

function applyFramingToForm() {
    const f = TAL.protocol.config.framing;
    if (!f) return;
    document.getElementById('framingStartEnabled').checked = f.startMarker.enabled;
    document.getElementById('framingStartValue').value = f.startMarker.value;
    document.getElementById('framingEndEnabled').checked = f.endMarker.enabled;
    document.getElementById('framingEndValue').value = f.endMarker.value;
    document.getElementById('framingStuffingEnabled').checked = f.byteStuffing.enabled;
    document.getElementById('framingEscapeByte').value = f.byteStuffing.escapeByte;
    document.getElementById('framingMask').value = f.byteStuffing.mask;
    document.getElementById('framingPadding').value = f.padding;
    document.getElementById('framingEndianness').value = f.endianness;
    document.getElementById('framingMaxPayload').value = f.maxPayloadSize;
    toggleFramingInputs();
}

function toggleFramingInputs() {
    setFramingInputState('framingStartValue', document.getElementById('framingStartEnabled').checked);
    setFramingInputState('framingEndValue', document.getElementById('framingEndEnabled').checked);
    setFramingInputState('framingEscapeByte', document.getElementById('framingStuffingEnabled').checked);
    setFramingInputState('framingMask', document.getElementById('framingStuffingEnabled').checked);
}

function setFramingInputState(id, enabled) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle('framing-disabled', !enabled);
}

function renderFramingErrors(errors) {
    errors = errors || [];
    const box = document.getElementById('framing-errors');
    if (box) {
        if (errors.length === 0) {
            box.style.display = 'none';
            box.innerHTML = '';
        } else {
            box.style.display = 'block';
            box.innerHTML = '<strong>Çerçeveleme hataları:</strong><br>' +
                errors.map(e => '• ' + escapeXml(e)).join('<br>');
        }
    }

    syncFieldError('err-framing-start', 'framingStartValue', errors, ['Start Marker']);
    syncFieldError('err-framing-end', 'framingEndValue', errors, ['End Marker']);
    syncFieldError('err-framing-escape', 'framingEscapeByte', errors, ['Escape Byte']);
    syncFieldError('err-framing-mask', 'framingMask', errors, ['Stuffing Mask']);
    syncFieldError('err-framing-padding', 'framingPadding', errors, ['Padding']);
    syncFieldError('err-framing-endianness', 'framingEndianness', errors, ['Endianness']);
    syncFieldError('err-framing-maxpayload', 'framingMaxPayload', errors, ['Max Payload Size']);
}

function syncFieldError(spanId, inputId, errors, keywords) {
    const span = document.getElementById(spanId);
    const input = document.getElementById(inputId);
    if (!span || !input) return;
    const message = errors.find(e => keywords.some(k => e.indexOf(k) !== -1));
    if (message) {
        span.innerText = message;
        span.classList.add('visible');
        input.classList.add('framing-invalid');
    } else {
        span.innerText = '';
        span.classList.remove('visible');
        input.classList.remove('framing-invalid');
    }
}

function changeFraming() {
    toggleFramingInputs();
    TAL.protocol.config.framing = readFramingFromForm();
    if (typeof TALFraming !== 'undefined') {
        renderFramingErrors(TALFraming.validate(TAL.protocol.config.framing));
    }
    updateByteTable();
}

function showSettingsSection(section) {
    const sections = ['general', 'framing', 'header', 'integrity', 'preview'];
    if (!sections.includes(section)) section = 'general';
    currentSettingsSection = section;

    document.querySelectorAll('[data-settings-section]').forEach(el => {
        el.style.display = el.dataset.settingsSection === section ? 'block' : 'none';
    });

    document.querySelectorAll('.settings-nav-btn').forEach(btn => btn.classList.remove('active'));
    const navBtn = document.getElementById(`nav-section-${section}`);
    if (navBtn) navBtn.classList.add('active');

    if (section === 'general') renderProtocolSummary();
    if (section === 'preview') updateByteTable();
}

function renderProtocolSummary() {
    if (typeof TALFraming === 'undefined') return;
    const framing = TAL.protocol.config.framing || TALFraming.defaultFraming();
    const framingErrors = TALFraming.validate(framing);

    const framingEl = document.getElementById('summary-framing');
    if (framingEl) {
        framingEl.innerText = framingErrors.length === 0 ? 'Geçerli' : 'Hatalı';
        framingEl.classList.toggle('summary-error', framingErrors.length > 0);
    }

    const integrityEl = document.getElementById('summary-integrity');
    if (integrityEl) {
        integrityEl.innerText = TAL.protocol.crcSize > 0
            ? `${TAL.protocol.crcType}-${TAL.protocol.crcSize}`
            : 'Yok';
    }

    const messagesEl = document.getElementById('summary-messages');
    if (messagesEl) messagesEl.innerText = TAL.messages.length;

    const typesEl = document.getElementById('summary-types');
    if (typesEl) typesEl.innerText = `${TAL.structs.length} / ${TAL.enums.length}`;

    const validationEl = document.getElementById('summary-validation');
    if (validationEl) {
        if (framingErrors.length > 0) {
            validationEl.innerText = `${framingErrors.length} çerçeveleme hatası var. Framing sekmesinden düzeltin.`;
            validationEl.classList.add('settings-validation-error');
        } else {
            validationEl.innerText = 'Çerçeveleme ayarları geçerli.';
            validationEl.classList.remove('settings-validation-error');
        }
    }
}

function updateByteTable() {
    const tbody = document.getElementById('byte-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let totalBytes = 0;
    const config = TAL.protocol.config;
    const framing = config.framing;

    if (framing && framing.startMarker.enabled && typeof TALFraming !== 'undefined') {
        const size = TALFraming.hexByteLength(framing.startMarker.value);
        tbody.innerHTML += `
            <tr>
                <td>Start Marker</td>
                <td>Hex/Bytes</td>
                <td style="font-family: monospace; color: #a5d6ff;">${escapeXml(framing.startMarker.value)}</td>
                <td style="text-align: right;">${size}</td>
                <td style="text-align: center;"><span class="status-badge status-active">Aktif</span></td>
            </tr>
        `;
        totalBytes += size;
    }
    headerElements.forEach(el => {
        let roleName = el.tag === 'Spare' ? 'Boşluk (Spare)' : (el.role || 'Özel Alan');
        tbody.innerHTML += `
            <tr>
                <td>Header: ${roleName}</td>
                <td>${el.tag === 'Spare' ? '-' : el.type}</td>
                <td style="font-family: monospace; color: #a5d6ff;">-</td>
                <td style="text-align: right;">${el.size}</td>
                <td style="text-align: center;"><span class="status-badge status-active">Aktif</span></td>
            </tr>
        `;
        totalBytes += parseInt(el.size);
    });
    
    // End Marker
    if (framing && framing.endMarker.enabled && typeof TALFraming !== 'undefined') {
        const size = TALFraming.hexByteLength(framing.endMarker.value);
        tbody.innerHTML += `
           <tr>
                <td>End Marker</td>
                <td>Hex/Bytes</td>
                <td style="font-family: monospace; color: #a5d6ff;">${escapeXml(framing.endMarker.value)}</td>
                <td style="text-align: right;">${size}</td>
                <td style="text-align: center;"><span class="status-badge status-active">Aktif</span></td>
            </tr>
        `;
        totalBytes += size;
    }

    if (framing) {
        const framingSettings = [
            {
                name: 'Byte Stuffing',
                hex: framing.byteStuffing.enabled
                    ? `Esc ${framing.byteStuffing.escapeByte} / Mask ${framing.byteStuffing.mask}`
                    : '-',
                enabled: framing.byteStuffing.enabled
            },
            { name: 'Padding', hex: framing.padding || '-', enabled: framing.padding !== '' },
            { name: 'Endianness', hex: framing.endianness || '-', enabled: framing.endianness !== '' },
            { name: 'Max Payload Size', hex: framing.maxPayloadSize || '-', enabled: framing.maxPayloadSize !== '' }
        ];

        framingSettings.forEach(field => {
            const statusClass = field.enabled ? 'status-active' : 'status-inactive';
            const statusText = field.enabled ? 'Aktif' : 'Pasif';
            tbody.innerHTML += `
                <tr>
                    <td>${field.name}</td>
                    <td>Ayar</td>
                    <td style="font-family: monospace; color: #a5d6ff;">${escapeXml(field.hex)}</td>
                    <td style="text-align: right;">-</td>
                    <td style="text-align: center;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });
    }
    
    // CRC
    if (TAL.protocol.crcSize > 0) {
        tbody.innerHTML += `
            <tr>
                <td>CRC (${TAL.protocol.crcType})</td>
                <td>Checksum</td>
                <td style="font-family: monospace; color: #a5d6ff;">Oto. Hesaplanır</td>
                <td style="text-align: right;">${TAL.protocol.crcSize / 8}</td>
                <td style="text-align: center;"><span class="status-badge status-active">Aktif</span></td>
            </tr>
        `;
        totalBytes += (TAL.protocol.crcSize / 8);
    }
    
    document.getElementById('total-bytes').textContent = `${totalBytes} Byte`;
}

function renderHeaderTable() {
    const tbody = document.getElementById('dynamic-header-body');
    if(!tbody) return;
    
    tbody.innerHTML = ''; 

    const hasBroadcast = headerElements.some(el => el.role === 'broadcast' && el.tag !== 'Spare');

    headerElements.forEach((element, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #333";
        
        let roleDisplay = element.role;
        if (element.role === 'destination' && hasBroadcast) {
            roleDisplay += ' (Opsiyonel)';
        }
        
        tr.innerHTML = `
            <td style="padding: 8px 0;">
                <select onchange="updateHeaderElement(${index}, 'tag', this.value)" style="width: 90%;">
                    <option value="Field" ${element.tag === 'Field' ? 'selected' : ''}>Field (Veri)</option>
                    <option value="Spare" ${element.tag === 'Spare' ? 'selected' : ''}>Spare (Boşluk)</option>
                </select>
            </td>
            <td>
                <select onchange="updateHeaderElement(${index}, 'role', this.value)" style="width: 90%;" ${element.tag === 'Spare' ? 'disabled' : ''}>
                    <option value="custom" ${element.role === 'custom' ? 'selected' : ''}>-- Özel Alan --</option>
                    <option value="sync" ${element.role === 'sync' ? 'selected' : ''}>Sync</option>
                    <option value="sender" ${element.role === 'sender' ? 'selected' : ''}>Sender</option>
                    <option value="destination" ${element.role === 'destination' ? 'selected' : ''}>Destination ${hasBroadcast && element.role === 'destination' ? '(Seçimlik)' : '*'}</option>
                    <option value="broadcast" ${element.role === 'broadcast' ? 'selected' : ''}>Broadcast</option>
                    <option value="messageId" ${element.role === 'messageId' ? 'selected' : ''}>Message ID</option>
                    <option value="messageType" ${element.role === 'messageType' ? 'selected' : ''}>Message Type</option>
                    <option value="payloadSize" ${element.role === 'payloadSize' ? 'selected' : ''}>Payload Size</option>
                </select>
            </td>
            <td>
                ${element.tag === 'Spare' 
                    ? '<span style="color: #777; text-align: center; display: block; width: 90%;">—</span>' 
                    : `<select onchange="updateHeaderElement(${index}, 'type', this.value)" style="width: 90%;" ${element.role === 'payloadSize' ? 'disabled' : ''}>
                        <option value="uint" ${element.type === 'uint' ? 'selected' : ''}>uint</option>
                        <option value="enum" ${element.type === 'enum' ? 'selected' : ''}>enum</option>
                        <option value="bool" ${element.type === 'bool' ? 'selected' : ''}>bool</option>
                       </select>`
                }
            </td>
            <td>
                <input type="number" min="1" value="${element.size}" onchange="updateHeaderElement(${index}, 'size', this.value)" style="width: 60px;">
            </td>
            <td>
                <button onclick="removeHeaderRow(${index})" style="background-color: #c0392b; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 3px;">Sil</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addHeaderRow() {
    headerElements.push({ tag: "Field", role: "custom", type: "uint", size: 1 });
    renderHeaderTable();
    updateByteTable();
    syncProtocolToMessages();
}

function updateHeaderElement(index, key, newValue) {
    if (key === 'size') {
        newValue = parseInt(newValue) || 1;
    }
    headerElements[index][key] = newValue;
    
    if (key === 'tag' && newValue === 'Spare') {
        headerElements[index].role = "";
        headerElements[index].type = "";
    }
    
    if (key === 'role' && newValue === 'payloadSize') {
        headerElements[index].type = 'uint';
    }
    
    renderHeaderTable();
    updateByteTable();
    syncProtocolToMessages();
}

function removeHeaderRow(index) {
    headerElements.splice(index, 1);
    renderHeaderTable();
    updateByteTable();
    syncProtocolToMessages();
}

// ------------------------------------------------------------------

function rebuildSpares(obj) {
    if (obj.type === 'enum') return;

    let headers = [];
    let crc = [];
    let payload = [];

    obj.fields.forEach(f => {
        if (f.isSpare) return;
        if (f.isHeader) headers.push(f);
        else if (f.isCrc) crc.push(f);
        else payload.push(f);
    });

    if (obj.type === 'protocol') {
        headers = [...payload];
        payload = [];
        crc = [];
    }

    let newFields = [...headers, ...payload];
    let totalBits = newFields.reduce((sum, f) => sum + f.size, 0);

    let spareSize = totalBits % 8 !== 0 ? 8 - (totalBits % 8) : 0;
    if (spareSize > 0) {
        newFields.push({ 
            id: generateUUID(), name: "spare", size: spareSize, typeId: "primitive", 
            comment: "Hizalama", isSpare: true, isArray: false, countFieldId: ""
        });
    }
    
    obj.fields = [...newFields, ...crc];
}

function loadView(type, id, updateHashFlag = true) {
    currentViewType = type;
    currentViewId = id;
    selectedItemIndex = null;
    
    if (updateHashFlag) {
        if (type === 'protocol') {
            updateHash('protocol');
        } else if (type === 'enum') {
            updateHash(`enum:${id}`);
        } else if (type === 'struct') {
            updateHash(`struct:${id}`);
        } else if (type === 'message') {
            updateHash(`message-${id}`);
        }
    }
    
    const obj = getObjectById(type, id);
    if (!obj) {
        document.getElementById('view-title').innerText = "Seçili Öğe Yok";
        document.getElementById('enum-toolbar').style.display = 'none';
        document.getElementById('struct-toolbar').style.display = 'none';
        document.getElementById('protocol-crc-toolbar').style.display = 'none';
        document.getElementById('protocol-framing-toolbar').style.display = 'none';
        document.getElementById('enum-view-container').style.display = 'none';
        document.getElementById('memory-map-container').style.display = 'none';
        document.getElementById('delete-element-btn').style.display = 'none';
        document.getElementById('properties-panel').style.display = 'none';
        document.getElementById('settings-sidebar').style.display = 'none';
        document.getElementById('settings-content').style.display = 'none';
        document.getElementById('sidebar-left').style.display = 'flex';
        document.getElementById('sidebar-right').style.display = 'block';
        currentViewType = null;
        currentViewId = null;
        selectedItemIndex = null;
        if (updateHashFlag) updateHash('explorer');
        return;
    }
    
    document.getElementById('view-title').innerText = obj.name + (type === 'enum' ? ` (${obj.size} bit)` : '');
    document.getElementById('delete-element-btn').style.display = type === 'protocol' ? 'none' : 'block';
    document.getElementById('properties-panel').style.display = 'none';

    const isEnum = type === 'enum';
    
    document.getElementById('enum-toolbar').style.display = isEnum ? 'flex' : 'none';
    document.getElementById('enum-view-container').style.display = isEnum ? 'block' : 'none';
    
    const isStructOrMessage = type === 'struct' || type === 'message';

    document.getElementById('struct-toolbar').style.display = isStructOrMessage ? 'flex' : 'none';
    document.getElementById('protocol-crc-toolbar').style.display = type === 'protocol' ? 'flex' : 'none';
    document.getElementById('protocol-framing-toolbar').style.display = type === 'protocol' ? 'block' : 'none';
    document.getElementById('memory-map-container').style.display = isStructOrMessage ? 'block' : 'none';

    if (type === 'protocol') {
        document.getElementById('sidebar-left').style.display = 'none';
        document.getElementById('sidebar-right').style.display = 'none';
        document.getElementById('settings-sidebar').style.display = 'flex';
        document.getElementById('settings-content').style.display = 'block';
        document.getElementById('protocol-settings-panel').style.display = 'block';
        
        const selectEl = document.getElementById('protocolCrcSelect');
        if (selectEl) selectEl.value = `${TAL.protocol.crcType}_${TAL.protocol.crcSize}`;
        
        if (typeof TALFraming !== 'undefined') {
            if (!TAL.protocol.config.framing) TAL.protocol.config.framing = TALFraming.defaultFraming();
            applyFramingToForm();
            renderFramingErrors(TALFraming.validate(TAL.protocol.config.framing));
        }

        renderHeaderTable();
        updateByteTable();
        showSettingsSection(currentSettingsSection);
    } else {
        document.getElementById('sidebar-left').style.display = 'flex';
        document.getElementById('sidebar-right').style.display = 'block';
        document.getElementById('settings-sidebar').style.display = 'none';
        document.getElementById('settings-content').style.display = 'none';
        document.getElementById('protocol-settings-panel').style.display = 'none';
        currentSettingsSection = 'general';
    }

    if (isEnum) {
        if (document.getElementById('enumGlobalSize')) document.getElementById('enumGlobalSize').value = obj.size;
        renderEnumList(obj);
    } else {
        updateTypeSelect();
        renderMemoryMap(obj);
    }
}

function updateEnumSize() {
    if (currentViewType !== 'enum') return;
    const obj = getObjectById(currentViewType, currentViewId);
    const newSize = parseInt(document.getElementById('enumGlobalSize').value);
    
    if (obj.size !== newSize) {
        obj.size = newSize;
        document.getElementById('view-title').innerText = obj.name + ` (${obj.size} bit)`;
        syncAllSizes();
    }
}

function deleteCurrentElement() {
    showConfirm('Bu öğeyi silmek istediğinize emin misiniz?', confirmed => {
        if (!confirmed) return;
        if (currentViewType === 'enum') TAL.enums = TAL.enums.filter(x => x.id !== currentViewId);
        else if (currentViewType === 'struct') TAL.structs = TAL.structs.filter(x => x.id !== currentViewId);
        else if (currentViewType === 'message') TAL.messages = TAL.messages.filter(x => x.id !== currentViewId);
        syncAllSizes();
        renderList();
        loadView(null, null);
    });
}

function deleteSelectedItem() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    
    if (currentViewType === 'enum') {
        obj.items.splice(selectedItemIndex, 1);
        renderEnumList(obj);
    } else {
        obj.fields.splice(selectedItemIndex, 1);
        rebuildSpares(obj);
        if (currentViewType === 'protocol') syncProtocolToMessages();
        else syncAllSizes();
        renderMemoryMap(obj);
    }
    
    document.getElementById('properties-panel').style.display = 'none';
    selectedItemIndex = null;
}

function updateTypeSelect() {
    const select = document.getElementById('newItemType');
    if (!select) return;
    select.innerHTML = '<option value="primitive">Primitive (Özel Boyut)</option>';
    
    TAL.enums.forEach(e => {
        select.innerHTML += `<option value="enum_${e.id}">Enum: ${e.name}</option>`;
    });
    
    TAL.structs.forEach(s => {
        if (s.id !== currentViewId) {
            select.innerHTML += `<option value="struct_${s.id}">Struct: ${s.name}</option>`;
        }
    });
    toggleSizeInput();
}

function toggleSizeInput() {
    const typeVal = document.getElementById('newItemType').value;
    document.getElementById('newItemSize').style.display = typeVal === 'primitive' ? 'inline-block' : 'none';
}

function addEnumItem() {
    const name = document.getElementById('enumItemName').value.trim();
    const valInput = document.getElementById('enumItemValue').value;
    if (!name) return;
    if (!isValidCppIdentifier(name)) { alert(`"${name}" geçerli bir C++ tanımlayıcısı değil.`); return; }

    const obj = getObjectById(currentViewType, currentViewId);
    if (obj.items.some(i => i.name === name)) { alert(`"${name}" bu enum içinde zaten var.`); return; }

    let value = valInput !== "" ? parseInt(valInput) : (obj.items.length > 0 ? obj.items[obj.items.length - 1].value + 1 : 0);

    obj.items.push({ name, value, comment: "" });
    document.getElementById('enumItemName').value = '';
    document.getElementById('enumItemValue').value = '';
    renderEnumList(obj);
}

function dropEnum(e, targetIndex) {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(fromIndex) || fromIndex === targetIndex) return;

    const obj = getObjectById(currentViewType, currentViewId);
    const item = obj.items.splice(fromIndex, 1)[0];
    obj.items.splice(targetIndex, 0, item);
    renderEnumList(obj);
}

function renderEnumList(obj) {
    const grid = document.getElementById('enum-list-grid');
    grid.innerHTML = '';

    obj.items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'enum-row';
        if (index === selectedItemIndex) row.classList.add('selected');
        row.innerHTML = `<span>${item.name}</span><span>${item.value}</span>`;
        
        row.draggable = true;
        row.ondragstart = (e) => e.dataTransfer.setData('text/plain', index);
        row.ondragover = (e) => e.preventDefault();
        row.ondrop = (e) => dropEnum(e, index);
        row.onclick = () => selectItem(index);
        
        grid.appendChild(row);
    });
}

function addFieldToCurrent() {
    const name = document.getElementById('newItemName').value.trim();
    const typeId = document.getElementById('newItemType').value;
    if (!name) return;
    if (!isValidCppIdentifier(name)) { alert(`"${name}" geçerli bir C++ tanımlayıcısı değil.`); return; }

    const obj = getObjectById(currentViewType, currentViewId);
    if (!isFieldNameUnique(obj, name)) { alert(`"${name}" bu struct/message/protocol içinde zaten kullanımda.`); return; }

    let size = 0;
    if (typeId === 'primitive') {
        size = parseInt(document.getElementById('newItemSize').value);
        if (isNaN(size) || size <= 0) return;
    } else {
        size = calculateTypeSize(typeId);
        if (size <= 0) return;
    }

    const fieldId = generateUUID();
    const newField = { id: fieldId, name: name, size: size, typeId: typeId, comment: "", isSpare: false, isArray: false, countFieldId: "" };
    
    obj.fields.push(newField);
    rebuildSpares(obj);
    
    document.getElementById('newItemName').value = '';
    if (typeId === 'primitive') document.getElementById('newItemSize').value = '';
    
    if (currentViewType === 'protocol') syncProtocolToMessages();
    else syncAllSizes();
    
    renderMemoryMap(obj);
}

function insertSidebarElement(type, id, targetFieldIndex) {
    dragCounters[type] = (dragCounters[type] || 0) + 1;
    const typeCap = type.charAt(0).toUpperCase() + type.slice(1);
    let name = `Dragged${typeCap}${dragCounters[type]}`;
    const obj = getObjectById(currentViewType, currentViewId);
    
    while (obj && !isFieldNameUnique(obj, name)) {
        dragCounters[type]++;
        name = `Dragged${typeCap}${dragCounters[type]}`;
    }

    const refObj = getObjectById(type, id);
    if (!refObj) return;

    const typeId = `${type}_${id}`;
    const size = calculateTypeSize(typeId);
    if (size <= 0) return;

    const fieldId = generateUUID();
    const newField = { id: fieldId, name: name, size: size, typeId: typeId, comment: "", isSpare: false, isArray: false, countFieldId: "" };
    
    if (targetFieldIndex === null) {
        let headers = obj.fields.filter(f => f.isHeader);
        let crc = obj.fields.filter(f => f.isCrc);
        let payload = obj.fields.filter(f => !f.isHeader && !f.isCrc && !f.isSpare);
        
        payload.push(newField);
        obj.fields = [...headers, ...payload, ...crc];
    } else {
        const targetField = obj.fields[targetFieldIndex];
        obj.fields = obj.fields.filter(f => !f.isSpare);
        const newTargetIndex = obj.fields.indexOf(targetField);
        if (newTargetIndex !== -1) {
            obj.fields.splice(newTargetIndex, 0, newField);
        } else {
            obj.fields.push(newField);
        }
    }

    rebuildSpares(obj);
    if (currentViewType === 'protocol') syncProtocolToMessages();
    else syncAllSizes();
    renderMemoryMap(obj);
}

function dropOnContainer(e) {
    const container = document.getElementById('memory-map-container');
    if (container && container.contains(e.target)) {
        e.preventDefault();
        const sidebarDataStr = e.dataTransfer.getData('application/json');
        if (sidebarDataStr) {
            try {
                const data = JSON.parse(sidebarDataStr);
                if (data.source === 'sidebar') {
                    insertSidebarElement(data.type, data.id, null);
                }
            } catch (err) {}
        }
    }
}

function dropField(e, targetIndex) {
    e.preventDefault();
    
    const sidebarDataStr = e.dataTransfer.getData('application/json');
    if (sidebarDataStr) {
        try {
            const data = JSON.parse(sidebarDataStr);
            if (data.source === 'sidebar') {
                insertSidebarElement(data.type, data.id, targetIndex);
                return;
            }
        } catch (err) {}
    }
    
    const obj = getObjectById(currentViewType, currentViewId);
    const targetField = obj.fields[targetIndex];
    if (targetField && (targetField.isSpare || targetField.isHeader || targetField.isCrc)) return;
    
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(fromIndex) || fromIndex === targetIndex) return;
    
    const draggedField = obj.fields[fromIndex];
    if (!draggedField || draggedField.isHeader || draggedField.isCrc) return;

    obj.fields = obj.fields.filter(f => !f.isSpare);

    let newFromIndex = obj.fields.indexOf(draggedField);
    let newTargetIndex = obj.fields.indexOf(targetField);

    obj.fields.splice(newFromIndex, 1);
    if (newFromIndex < newTargetIndex) newTargetIndex--;
    obj.fields.splice(newTargetIndex, 0, draggedField);

    rebuildSpares(obj);
    if (currentViewType === 'protocol') syncProtocolToMessages();
    else syncAllSizes();
    renderMemoryMap(obj);
}

function calculateByteLabels(obj) {
    let byteLabels = [];
    let currentConst = 0;
    
    let startBit = 0;
    let startBytes = [];
    obj.fields.forEach((f) => {
        startBytes.push(Math.floor(startBit / 8));
        startBit += f.size;
    });

    let fieldOffsets = [];
    obj.fields.forEach((f, j) => {
        if (j === 0) {
            fieldOffsets.push({ const: 0, dyn: [] });
        } else {
            let prevF = obj.fields[j - 1];
            if (prevF.isArray) {
                const countName = getCountFieldName(obj, prevF.countFieldId);
                const elemSize = prevF.size / 8;
                fieldOffsets.push({
                    const: fieldOffsets[j - 1].const,
                    dyn: [...fieldOffsets[j - 1].dyn, `${countName} * ${elemSize}`]
                });
            } else {
                let diff = startBytes[j] - startBytes[j - 1];
                fieldOffsets.push({
                    const: fieldOffsets[j - 1].const + diff,
                    dyn: [...fieldOffsets[j - 1].dyn]
                });
            }
        }
    });

    let bitArray = [];
    obj.fields.forEach((field, index) => {
        for (let i = 0; i < field.size; i++) {
            bitArray.push(index);
        }
    });
    while (bitArray.length % 8 !== 0) {
        bitArray.push(-1); 
    }
    const totalBytes = bitArray.length / 8;

    for (let byteIdx = 0; byteIdx < totalBytes; byteIdx++) {
        let flatIdx = byteIdx * 8 + 0;
        let fieldIdx = bitArray[flatIdx];
        
        if (fieldIdx === -1) {
            for (let b = 1; b < 8; b++) {
                if (bitArray[byteIdx * 8 + b] !== -1) {
                    fieldIdx = bitArray[byteIdx * 8 + b];
                    break;
                }
            }
        }

        if (fieldIdx === -1) {
            byteLabels.push(`${currentConst}`);
            currentConst++;
        } else {
            let f = obj.fields[fieldIdx];
            let startB = startBytes[fieldIdx];
            let offsetInField = byteIdx - startB;
            let offsetInfo = fieldOffsets[fieldIdx];
            
            let constVal = offsetInfo.const + offsetInField;
            let dynTerms = [...offsetInfo.dyn];
            let arrayTerm = null;

            if (f.isArray) {
                const countName = getCountFieldName(obj, f.countFieldId);
                const elemSize = f.size / 8;
                arrayTerm = `(${countName} * ${elemSize})`;
            }

            let parts = [];
            if (constVal !== 0 || (dynTerms.length === 0 && !arrayTerm)) {
                parts.push(constVal);
            }
            dynTerms.forEach(t => parts.push(t));
            if (arrayTerm) {
                parts.push(arrayTerm);
            }
            byteLabels.push(parts.join(' + '));
        }
    }
    return byteLabels;
}

function renderMemoryMap(obj) {
    const container = document.getElementById('memory-map-container');
    container.innerHTML = '';

    if (obj.fields.length === 0) {
        container.innerHTML = '<div style="padding: 50px; text-align: center; color: #888; border: 2px dashed #3c3c3c;">Boş. Soldan öğe sürükleyin veya yukarıdan alan ekleyin.</div>';
        return;
    }

    let table = '<table class="memory-table">';
    table += '<tr><th class="byte-col">Byte</th><th>Bit 7</th><th>Bit 6</th><th>Bit 5</th><th>Bit 4</th><th>Bit 3</th><th>Bit 2</th><th>Bit 1</th><th>Bit 0</th></tr>';
    
    let bitArray = [];
    obj.fields.forEach((field, index) => {
        for (let i = 0; i < field.size; i++) {
            bitArray.push(index);
        }
    });

    while (bitArray.length % 8 !== 0) {
        bitArray.push(-1); 
    }

    const totalBytes = bitArray.length / 8;
    const byteLabels = calculateByteLabels(obj);
    let renderedBits = new Array(bitArray.length).fill(false);

    for (let byteIdx = 0; byteIdx < totalBytes; byteIdx++) {
        table += '<tr>';
        table += `<td class="byte-col">${byteLabels[byteIdx]}</td>`;
        
        for (let visualCol = 0; visualCol < 8; visualCol++) {
            let bitWeight = 7 - visualCol;
            let flatIdx = byteIdx * 8 + bitWeight;
            
            if (renderedBits[flatIdx]) continue;

            let fieldIndex = bitArray[flatIdx];
            if (fieldIndex === -1) {
                table += '<td class="empty-bit"></td>';
                renderedBits[flatIdx] = true;
                continue;
            }
            
            let colSpan = 0;
            for (let c = visualCol; c < 8; c++) {
                let w = 7 - c;
                if (bitArray[byteIdx * 8 + w] === fieldIndex) colSpan++;
                else break;
            }
            
            let rowSpan = 1;
            if (visualCol === 0 && colSpan === 8) {
                for (let r = byteIdx + 1; r < totalBytes; r++) {
                    let rowBelongsToField = true;
                    for (let c = 0; c < 8; c++) {
                        let w = 7 - c;
                        if (bitArray[r * 8 + w] !== fieldIndex) {
                            rowBelongsToField = false;
                            break;
                        }
                    }
                    if (rowBelongsToField) rowSpan++;
                    else break;
                }
            }
            
            for (let r = 0; r < rowSpan; r++) {
                for (let c = 0; c < colSpan; c++) {
                    let w = 7 - (visualCol + c);
                    renderedBits[(byteIdx + r) * 8 + w] = true;
                }
            }
            
            let field = obj.fields[fieldIndex];
            let classNames = 'data-cell';
            let draggableAttr = (field.isSpare || field.isHeader || field.isCrc) ? '' : `draggable="true" ondragstart="event.dataTransfer.setData('text/plain', ${fieldIndex})" ondragover="event.preventDefault()" ondrop="dropField(event, ${fieldIndex})"`;

            if (field.isSpare) classNames += ' spare';
            else {
                if (field.typeId === 'primitive') classNames += ' type-primitive';
                else if (field.typeId.startsWith('enum_')) classNames += ' type-enum';
                else if (field.typeId.startsWith('struct_')) classNames += ' type-struct';
                else if (field.typeId.startsWith('message_')) classNames += ' type-message';
            }
            
            if (field.isHeader || field.isCrc) classNames += ' locked-field';
            if (field.isArray) classNames += ' dynamic-array-frame';
            if (fieldIndex === selectedItemIndex) classNames += ' selected';

            let label = field.name;
            if (field.typeId !== "primitive") label += `<br>[${getCustomTypeName(field.typeId)}]`;
            
            table += `<td class="${classNames}" colspan="${colSpan}" rowspan="${rowSpan}" ${draggableAttr} onclick="selectItem(${fieldIndex})">${label}</td>`;
        }
        table += '</tr>';
    }
    table += '</table>';
    container.innerHTML = table;
}

function selectItem(index) {
    selectedItemIndex = index;
    const obj = getObjectById(currentViewType, currentViewId);
    const item = currentViewType === 'enum' ? obj.items[index] : obj.fields[index];

    document.getElementById('properties-panel').style.display = 'block';

    if (currentViewType === 'enum') {
        renderEnumList(obj); 
        document.getElementById('prop-size-label').innerText = "Sayısal Değer:";
        document.getElementById('prop-size').value = item.value;
        document.getElementById('prop-size').readOnly = true;
        document.getElementById('prop-type-label').style.display = 'none';
        document.getElementById('prop-type').style.display = 'none';
        document.getElementById('prop-is-array-container').style.display = 'none';
        document.getElementById('prop-count-field-container').style.display = 'none';
        document.getElementById('prop-spare-section').style.display = 'none';
        document.getElementById('prop-delete-btn').style.display = 'block';
    } else {
        renderMemoryMap(obj); 
        document.getElementById('prop-size-label').innerText = "Boyut (Bit):";
        document.getElementById('prop-size').value = item.size;
        document.getElementById('prop-type-label').style.display = 'block';
        document.getElementById('prop-type').style.display = 'block';
        document.getElementById('prop-type').value = getCustomTypeName(item.typeId);

        if (item.isHeader || item.isCrc) {
            document.getElementById('prop-name').readOnly = true;
            document.getElementById('prop-size').readOnly = true;
            document.getElementById('prop-is-array-container').style.display = 'none';
            document.getElementById('prop-count-field-container').style.display = 'none';
            document.getElementById('prop-spare-section').style.display = 'none';
            document.getElementById('prop-delete-btn').style.display = 'none';
        } else if (item.isSpare) {
            document.getElementById('prop-name').readOnly = false;
            document.getElementById('prop-size').readOnly = true;
            document.getElementById('prop-is-array-container').style.display = 'none';
            document.getElementById('prop-count-field-container').style.display = 'none';
            document.getElementById('prop-spare-section').style.display = 'block';
            document.getElementById('prop-spare-use-size').max = item.size;
            document.getElementById('prop-spare-use-size').value = '';
            document.getElementById('prop-spare-name').value = '';
            document.getElementById('prop-delete-btn').style.display = 'none';
        } else {
            document.getElementById('prop-name').readOnly = false;
            document.getElementById('prop-size').readOnly = item.typeId !== 'primitive';
            document.getElementById('prop-is-array-container').style.display = 'block';
            document.getElementById('prop-is-array').checked = !!item.isArray;
            updateCountFieldSelect(obj, item);
            document.getElementById('prop-count-field-container').style.display = item.isArray ? 'block' : 'none';
            document.getElementById('prop-spare-section').style.display = 'none';
            document.getElementById('prop-delete-btn').style.display = 'block';
        }
    }

    document.getElementById('prop-name').value = item.name;
    document.getElementById('prop-comment').value = item.comment;
}

function updateCountFieldSelect(obj, currentItem) {
    const select = document.getElementById('prop-count-field');
    select.innerHTML = '';
    
    const validFields = obj.fields.filter(f => !f.isSpare && !f.isHeader && !f.isCrc && f.id !== currentItem.id && f.typeId === 'primitive');
    
    validFields.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.text = f.name;
        if (f.id === currentItem.countFieldId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    if (select.children.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.text = 'Önce bir count primitive alan ekleyin';
        select.appendChild(option);
    }
}

function toggleIsArray() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    const item = obj.fields[selectedItemIndex];
    
    item.isArray = document.getElementById('prop-is-array').checked;
    
    if (item.isArray) {
        const select = document.getElementById('prop-count-field');
        const validFields = obj.fields.filter(f => !f.isSpare && !f.isHeader && !f.isCrc && f.id !== item.id && f.typeId === 'primitive');
        if (validFields.length > 0) {
            item.countFieldId = validFields[0].id;
        } else {
            item.countFieldId = '';
        }
        document.getElementById('prop-count-field-container').style.display = 'block';
    } else {
        item.countFieldId = '';
        document.getElementById('prop-count-field-container').style.display = 'none';
    }
    
    syncAllSizes();
    renderMemoryMap(obj);
    selectItem(selectedItemIndex);
}

function changeCountField() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    const item = obj.fields[selectedItemIndex];
    
    item.countFieldId = document.getElementById('prop-count-field').value;
    
    syncAllSizes();
    renderMemoryMap(obj);
}

function saveSize() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    const item = obj.fields[selectedItemIndex];
    if (!item || item.isSpare || item.isHeader || item.isCrc || item.typeId !== 'primitive') return;

    const newSize = parseInt(document.getElementById('prop-size').value);
    if (isNaN(newSize) || newSize <= 0) {
        alert('Geçersiz boyut. Pozitif bir sayı girin.');
        document.getElementById('prop-size').value = item.size;
        return;
    }
    item.size = newSize;
    rebuildSpares(obj);
    
    if (currentViewType === 'protocol') syncProtocolToMessages();
    else syncAllSizes();
    
    renderMemoryMap(obj);
    const newIndex = obj.fields.findIndex(f => f.id === item.id);
    if (newIndex !== -1) selectItem(newIndex);
}

function convertSpare() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    const spare = obj.fields[selectedItemIndex];
    if (!spare || !spare.isSpare) return;

    const name = document.getElementById('prop-spare-name').value.trim();
    const useBits = parseInt(document.getElementById('prop-spare-use-size').value);

    if (!name) { alert('Alan adı boş olamaz.'); return; }
    if (!isValidCppIdentifier(name)) { alert(`"${name}" geçerli bir C++ tanımlayıcısı değil.`); return; }
    if (!isFieldNameUnique(obj, name)) { alert(`"${name}" bu struct/message/protocol içinde zaten kullanımda.`); return; }
    if (isNaN(useBits) || useBits <= 0 || useBits > spare.size) {
        alert(`Geçersiz boyut. 1 ile ${spare.size} arasında bir değer girin.`);
        return;
    }

    const fieldId = generateUUID();
    const newField = { id: fieldId, name: name, size: useBits, typeId: 'primitive', comment: '', isSpare: false, isArray: false, countFieldId: '' };

    const remaining = spare.size - useBits;
    const spareIndex = selectedItemIndex;
    obj.fields.splice(spareIndex, 1, newField);
    if (remaining > 0) {
        obj.fields.splice(spareIndex + 1, 0, {
            id: generateUUID(), name: 'spare', size: remaining, typeId: 'primitive', comment: 'Hizalama', isSpare: true, isArray: false, countFieldId: ''
        });
    }

    if (currentViewType === 'protocol') syncProtocolToMessages();
    else syncAllSizes();
    
    renderMemoryMap(obj);
    document.getElementById('properties-panel').style.display = 'none';
    selectedItemIndex = null;
}

function saveComment() {
    if (selectedItemIndex === null) return;
    const obj = getObjectById(currentViewType, currentViewId);
    const item = currentViewType === 'enum' ? obj.items[selectedItemIndex] : obj.fields[selectedItemIndex];
    
    if (currentViewType !== 'enum' && !item.isHeader && !item.isCrc) {
        const newName = document.getElementById('prop-name').value.trim();
        if (newName && newName !== item.name) {
            if (isValidCppIdentifier(newName) && isFieldNameUnique(obj, newName, item.id)) {
                item.name = newName;
            } else {
                document.getElementById('prop-name').value = item.name;
                alert(`Geçersiz veya çakışan ad: "${newName}"`);
            }
        }
    }
    
    item.comment = document.getElementById('prop-comment').value;
    
    if (currentViewType === 'protocol') syncProtocolToMessages();
    if (currentViewType !== 'enum') renderMemoryMap(obj);
}

function escapeXml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function generateXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<TAL_Protocol>\n';

    xml += `  <Protocol crcType="${escapeXml(TAL.protocol.crcType)}" crcSize="${TAL.protocol.crcSize}">\n`;
    if (typeof TALFraming !== 'undefined') {
        if (!TAL.protocol.config.framing) TAL.protocol.config.framing = TALFraming.defaultFraming();
        const framingXml = TALFraming.serialize(TAL.protocol.config.framing, '  ');
        xml += framingXml.split('\n').map(line => '    ' + line).join('\n') + '\n';
    }

    // DINAMIK HEADER - XML URETIMI
    xml += `    <HeaderElements>\n`;
    headerElements.forEach(h => {
        if(h.tag === 'Spare') {
            xml += `      <Spare size="${h.size}" />\n`;
        } else {
            xml += `      <Field role="${h.role}" type="${h.type}" size="${h.size}" />\n`;
        }
    });
    xml += `    </HeaderElements>\n`;

    TAL.protocol.fields.forEach(f => {
        let typeName = f.typeId === 'primitive' ? 'primitive' : getCustomTypeName(f.typeId);
        let isArrayAttr = f.isArray ? ` isArray="true" countField="${escapeXml(getCountFieldName(TAL.protocol, f.countFieldId))}"` : '';
        xml += `    <Field name="${escapeXml(f.name)}" type="${escapeXml(typeName)}" size="${f.size}" spare="${f.isSpare}"${isArrayAttr} comment="${escapeXml(f.comment)}"/>\n`;
    });
    xml += `  </Protocol>\n\n`;

    TAL.enums.forEach(e => {
        xml += `  <Enum name="${escapeXml(e.name)}" size="${e.size}">\n`;
        e.items.forEach(i => {
            xml += `    <Element name="${escapeXml(i.name)}" value="${escapeXml(i.value)}" comment="${escapeXml(i.comment)}"/>\n`;
        });
        xml += `  </Enum>\n`;
    });

    TAL.structs.forEach(s => {
        xml += `  <Struct name="${escapeXml(s.name)}">\n`;
        s.fields.forEach(f => {
            let typeName = f.typeId === 'primitive' ? 'primitive' : getCustomTypeName(f.typeId);
            let isArrayAttr = f.isArray ? ` isArray="true" countField="${escapeXml(getCountFieldName(s, f.countFieldId))}"` : '';
            xml += `    <Field name="${escapeXml(f.name)}" type="${escapeXml(typeName)}" size="${f.size}" spare="${f.isSpare}"${isArrayAttr} comment="${escapeXml(f.comment)}"/>\n`;
        });
        xml += `  </Struct>\n`;
    });

    TAL.messages.forEach(m => {
        xml += `  <Message name="${escapeXml(m.name)}">\n`;
        m.fields.forEach(f => {
            let typeName = f.typeId === 'primitive' ? 'primitive' : getCustomTypeName(f.typeId);
            let isArrayAttr = f.isArray ? ` isArray="true" countField="${escapeXml(getCountFieldName(m, f.countFieldId))}"` : '';
            let isHeaderAttr = f.isHeader ? ` isHeader="true"` : '';
            let isCrcAttr = f.isCrc ? ` isCrc="true"` : '';
            xml += `    <Field name="${escapeXml(f.name)}" type="${escapeXml(typeName)}" size="${f.size}" spare="${f.isSpare}"${isArrayAttr}${isHeaderAttr}${isCrcAttr} comment="${escapeXml(f.comment)}"/>\n`;
        });
        xml += `  </Message>\n`;
    });

    xml += '</TAL_Protocol>';
    document.getElementById('xmlOutput').value = xml;
}

function downloadXML() {
    if (typeof TALFraming !== 'undefined') {
        if (!TAL.protocol.config.framing) {
            TAL.protocol.config.framing = TALFraming.defaultFraming();
        }
        const framingErrors = TALFraming.validate(TAL.protocol.config.framing);
        if (framingErrors.length > 0) {
            renderFramingErrors(framingErrors);
            if (currentViewType !== 'protocol') {
                loadView('protocol', 'protocol');
            }
            showAlert('Kaydedilemedi. Lütfen çerçeveleme ayarlarını düzeltin:\n\n' +
                framingErrors.map(e => '• ' + e).join('\n'));
            return;
        }
    }

    generateXML();
    
    const xmlContent = document.getElementById('xmlOutput').value;
    if (!xmlContent) return;
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TAL.xml';
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadXML(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const xmlText = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        TAL.protocol = { 
            id: 'protocol', 
            name: 'Protokol Ayarları', 
            type: 'protocol', 
            fields: [], 
            crcType: 'NONE', 
            crcSize: 0, 
            comment: '',
            config: {
                framing: typeof TALFraming !== 'undefined' ? TALFraming.defaultFraming() : null
            }
        };
        TAL.enums = [];
        TAL.structs = [];
        TAL.messages = [];
        headerElements = [];
        
        const nameMap = {};
        
        const protocolNode = xmlDoc.getElementsByTagName("Protocol")[0];
        if (protocolNode) {
            TAL.protocol.crcType = protocolNode.getAttribute("crcType") || 'NONE';
            TAL.protocol.crcSize = parseInt(protocolNode.getAttribute("crcSize") || 0);
            if (typeof TALFraming !== 'undefined') {
                TAL.protocol.config.framing = TALFraming.parse(xmlText);
            }
            
            const headerNode = protocolNode.getElementsByTagName("HeaderElements")[0];
            if(headerNode) {
                const hFields = headerNode.children;
                for(let k = 0; k < hFields.length; k++) {
                    const hf = hFields[k];
                    if(hf.tagName === 'Spare') {
                        headerElements.push({ tag: 'Spare', role: '', type: '', size: parseInt(hf.getAttribute('size')) });
                    } else {
                        headerElements.push({ tag: 'Field', role: hf.getAttribute('role'), type: hf.getAttribute('type'), size: parseInt(hf.getAttribute('size')) });
                    }
                }
            }

            const fieldNodes = protocolNode.getElementsByTagName("Field");
            for (let j = 0; j < fieldNodes.length; j++) {
                const fNode = fieldNodes[j];

                if(fNode.parentNode.tagName !== 'HeaderElements') {
                    TAL.protocol.fields.push({
                        id: generateUUID(),
                        name: fNode.getAttribute("name"),
                        rawType: fNode.getAttribute("type"),
                        size: parseInt(fNode.getAttribute("size")),
                        isSpare: fNode.getAttribute("spare") === "true",
                        isArray: fNode.getAttribute("isArray") === "true",
                        rawCountField: fNode.getAttribute("countField") || "",
                        comment: fNode.getAttribute("comment") || "",
                        typeId: "primitive",
                        countFieldId: ""
                    });
                }
            }
        }
        
        const enums = xmlDoc.getElementsByTagName("Enum");
        for (let i = 0; i < enums.length; i++) {
            const el = enums[i];
            const id = generateUUID();
            const name = el.getAttribute("name");
            const size = parseInt(el.getAttribute("size"));
            const items = [];
            
            const elements = el.getElementsByTagName("Element");
            for (let j = 0; j < elements.length; j++) {
                items.push({
                    name: elements[j].getAttribute("name"),
                    value: parseInt(elements[j].getAttribute("value")),
                    comment: elements[j].getAttribute("comment") || ""
                });
            }
            
            TAL.enums.push({ id, name, type: 'enum', comment: "", size, items });
            nameMap[name] = { type: 'enum', id };
        }
        
        const parseComplex = (tag, talArray, typeName) => {
            const nodes = xmlDoc.getElementsByTagName(tag);
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                const id = generateUUID();
                const name = el.getAttribute("name");
                
                const fields = [];
                const fieldNodes = el.getElementsByTagName("Field");
                for (let j = 0; j < fieldNodes.length; j++) {
                    const fNode = fieldNodes[j];
                    if(fNode.parentNode.tagName !== 'HeaderElements') {
                        fields.push({
                            id: generateUUID(),
                            name: fNode.getAttribute("name"),
                            rawType: fNode.getAttribute("type"),
                            size: parseInt(fNode.getAttribute("size")),
                            isSpare: fNode.getAttribute("spare") === "true",
                            isArray: fNode.getAttribute("isArray") === "true",
                            isHeader: fNode.getAttribute("isHeader") === "true",
                            isCrc: fNode.getAttribute("isCrc") === "true",
                            rawCountField: fNode.getAttribute("countField") || "",
                            comment: fNode.getAttribute("comment") || "",
                            typeId: "primitive",
                            countFieldId: ""
                        });
                    }
                }
                
                talArray.push({ id, name, type: typeName, comment: "", fields });
                nameMap[name] = { type: typeName, id };
            }
        };
        
        parseComplex("Struct", TAL.structs, "struct");
        parseComplex("Message", TAL.messages, "message");
        
        const resolveRefs = (objList) => {
            objList.forEach(obj => {
                obj.fields.forEach(f => {
                    if (f.rawType && f.rawType !== 'primitive' && nameMap[f.rawType]) {
                        f.typeId = nameMap[f.rawType].type + '_' + nameMap[f.rawType].id;
                    }
                    if (f.isArray && f.rawCountField) {
                        const countTarget = obj.fields.find(cf => cf.name === f.rawCountField);
                        if (countTarget) f.countFieldId = countTarget.id;
                    }
                    delete f.rawType;
                    delete f.rawCountField;
                });
            });
        };
        
        resolveRefs([TAL.protocol]);
        resolveRefs(TAL.structs);
        resolveRefs(TAL.messages);
        
        document.getElementById('xmlFileInput').value = ""; 
        renderList();
        loadView(null, null);
        document.getElementById('xmlOutput').value = xmlText;
    };
    reader.readAsText(file);
}