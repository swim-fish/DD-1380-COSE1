// --- START: QR Code 掃描相關函式 ---
let codeReader = null;
let currentName = '';
let currentidLast4 = '';
let maxVitalsCols = 6;
let currentInjuryMode = 'burn'; // 'burn' or 'trauma'
let traumaModal;
let traumaSelections = new Set();

const burnPercentageMap = {
    'head_face_neck_front': 4.5,
    'head_face_neck_back': 4.5,
    'torso_front': 18,
    'torso_back': 18,
    'left_arm_front': 4.5,
    'left_arm_back': 4.5,
    'right_arm_front': 4.5,
    'right_arm_back': 4.5,
    'perineum': 1,
    'left_leg_front': 9,
    'left_leg_back': 9,
    'right_leg_front': 9,
    'right_leg_back': 9,
};

const traumaMap = {
    face: {
        front: {
            title: '臉部 (正面)',
            svg: `<svg viewBox="0 0 150 150">
                    <g>
                        <path class="trauma-detail-part" id="trauma-face-front-眼睛" d="M30 50 A 15 15 0 0 1 70 50 A 15 15 0 0 1 30 50 M80 50 A 15 15 0 0 1 120 50 A 15 15 0 0 1 80 50" />
                        <text x="75" y="45" class="svg-detail-label">Eyes 眼睛</text>
                        <path class="trauma-detail-part" id="trauma-face-front-鼻子" d="M70 60 L 80 60 L 75 75 Z" />
                        <text x="75" y="68" class="svg-detail-label">Nose 鼻子</text>
                        <path class="trauma-detail-part" id="trauma-face-front-嘴巴" d="M60 85 A 15 5 0 0 1 90 85 A 15 5 0 0 1 60 85" />
                        <text x="75" y="88" class="svg-detail-label">Mouth 嘴巴</text>
                        <path class="trauma-detail-part" id="trauma-face-front-耳朵" d="M20 55 A 10 15 0 0 1 20 85 M130 55 A 10 15 0 0 0 130 85" />
                        <text x="15" y="70" class="svg-detail-label">Ears 耳朵</text>
                        <path class="trauma-detail-part" id="trauma-face-front-頸部" d="M55 100 H 95 V 130 H 55 Z" />
                        <text x="75" y="115" class="svg-detail-label">Neck 頸部</text>
                    </g>
                </svg>`
        },
        back: {
            title: '臉部 (背面)',
            svg: `<svg viewBox="0 0 100 100">
                    <rect class="trauma-detail-part" id="trauma-face-back-右上" x="50" y="0" width="50" height="50"/>
                    <text x="75" y="25" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Top</tspan><tspan x="75" dy="1.2em">右上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-face-back-左上" x="0" y="0" width="50" height="50"/>
                    <text x="25" y="25" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Top</tspan><tspan x="25" dy="1.2em">左上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-face-back-右下" x="50" y="50" width="50" height="50"/>
                    <text x="75" y="75" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Bottom</tspan><tspan x="75" dy="1.2em">右下</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-face-back-左下" x="0" y="50" width="50" height="50"/>
                    <text x="25" y="75" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Bottom</tspan><tspan x="25" dy="1.2em">左下</tspan></text>
                </svg>`
        }
    },
    chest: {
        front: {
            title: '胸部 (正面)',
            svg: `<svg viewBox="0 0 100 100">
                    <rect class="trauma-detail-part" id="trauma-chest-front-右上" x="50" y="0" width="50" height="50"/>
                    <text x="75" y="25" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Top</tspan><tspan x="75" dy="1.2em">右上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-front-左上" x="0" y="0" width="50" height="50"/>
                    <text x="25" y="25" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Top</tspan><tspan x="25" dy="1.2em">左上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-front-右下" x="50" y="50" width="50" height="50"/>
                    <text x="75" y="75" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Bottom</tspan><tspan x="75" dy="1.2em">右下</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-front-左下" x="0" y="50" width="50" height="50"/>
                    <text x="25" y="75" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Bottom</tspan><tspan x="25" dy="1.2em">左下</tspan></text>
                </svg>`
        },
        back: {
            title: '胸部 (背面)',
            svg: `<svg viewBox="0 0 100 100">
                    <rect class="trauma-detail-part" id="trauma-chest-back-右上" x="50" y="0" width="50" height="50"/>
                    <text x="75" y="25" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Top</tspan><tspan x="75" dy="1.2em">右上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-back-左上" x="0" y="0" width="50" height="50"/>
                    <text x="25" y="25" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Top</tspan><tspan x="25" dy="1.2em">左上</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-back-右下" x="50" y="50" width="50" height="50"/>
                    <text x="75" y="75" class="svg-detail-label"><tspan x="75" dy="-0.6em">R-Bottom</tspan><tspan x="75" dy="1.2em">右下</tspan></text>
                    <rect class="trauma-detail-part" id="trauma-chest-back-左下" x="0" y="50" width="50" height="50"/>
                    <text x="25" y="75" class="svg-detail-label"><tspan x="25" dy="-0.6em">L-Bottom</tspan><tspan x="25" dy="1.2em">左下</tspan></text>
                </svg>`
        }
    },
    hand: {
        front: {
            title: '手 (正面)',
            svg: `<svg viewBox="0 0 100 100">
                  <rect class="trauma-detail-part" id="trauma-hand-front-肩" y="0" width="100" height="20" />
                  <text x="50" y="12" class="svg-detail-label">Shoulder 肩</text>
                  <rect class="trauma-detail-part" id="trauma-hand-front-上臂" y="20" width="100" height="30" />
                  <text x="50" y="37" class="svg-detail-label">Upper Arm 上臂</text>
                  <rect class="trauma-detail-part" id="trauma-hand-front-手肘" y="50" width="100" height="10" />
                  <text x="50" y="57" class="svg-detail-label">Elbow 手肘</text>
                  <rect class="trauma-detail-part" id="trauma-hand-front-前臂" y="60" width="100" height="30" />
                  <text x="50" y="77" class="svg-detail-label">Forearm 前臂</text>
                  <rect class="trauma-detail-part" id="trauma-hand-front-手掌" y="90" width="100" height="10" />
                  <text x="50" y="97" class="svg-detail-label">Palm 手掌</text>
              </svg>`
        },
        back: {
            title: '手 (背面)',
            svg: `<svg viewBox="0 0 100 100">
                  <rect class="trauma-detail-part" id="trauma-hand-back-肩" y="0" width="100" height="20" />
                  <text x="50" y="12" class="svg-detail-label">Shoulder 肩</text>
                  <rect class="trauma-detail-part" id="trauma-hand-back-上臂" y="20" width="100" height="30" />
                  <text x="50" y="37" class="svg-detail-label">Upper Arm 上臂</text>
                  <rect class="trauma-detail-part" id="trauma-hand-back-手肘" y="50" width="100" height="10" />
                  <text x="50" y="57" class="svg-detail-label">Elbow 手肘</text>
                  <rect class="trauma-detail-part" id="trauma-hand-back-前臂" y="60" width="100" height="30" />
                  <text x="50" y="77" class="svg-detail-label">Forearm 前臂</text>
                  <rect class="trauma-detail-part" id="trauma-hand-back-手背" y="90" width="100" height="10" />
                  <text x="50" y="97" class="svg-detail-label">Dorsum 手背</text>
              </svg>`
        }
    },
    leg: {
        front: {
            title: '腳 (正面)',
            svg: `<svg viewBox="0 0 100 100">
                  <rect class="trauma-detail-part" id="trauma-leg-front-大腿" y="0" width="100" height="40" />
                  <text x="50" y="22" class="svg-detail-label">Thigh 大腿</text>
                  <rect class="trauma-detail-part" id="trauma-leg-front-膝蓋" y="40" width="100" height="10" />
                  <text x="50" y="47" class="svg-detail-label">Knee 膝蓋</text>
                  <rect class="trauma-detail-part" id="trauma-leg-front-小腿" y="50" width="100" height="40" />
                  <text x="50" y="72" class="svg-detail-label">Lower Leg 小腿</text>
                  <rect class="trauma-detail-part" id="trauma-leg-front-腳掌" y="90" width="100" height="10" />
                  <text x="50" y="97" class="svg-detail-label">Foot 腳掌</text>
              </svg>`
        },
        back: {
            title: '腳 (背面)',
            svg: `<svg viewBox="0 0 100 100">
                  <rect class="trauma-detail-part" id="trauma-leg-back-大腿" y="0" width="100" height="40" />
                  <text x="50" y="22" class="svg-detail-label">Thigh 大腿</text>
                  <rect class="trauma-detail-part" id="trauma-leg-back-膝蓋窩" y="40" width="100" height="10" />
                  <text x="50" y="47" class="svg-detail-label">Popliteal 膝蓋窩</text>
                  <rect class="trauma-detail-part" id="trauma-leg-back-小腿" y="50" width="100" height="40" />
                  <text x="50" y="72" class="svg-detail-label">Lower Leg 小腿</text>
                  <rect class="trauma-detail-part" id="trauma-leg-back-腳底" y="90" width="100" height="10" />
                  <text x="50" y="97" class="svg-detail-label">Sole 腳底</text>
              </svg>`
        }
    },
    buttocks: {
        back: {
             title: '臀部',
             svg: `<svg viewBox="0 0 100 100">
                  <rect class="trauma-detail-part" id="trauma-buttocks-back-左邊" x="0" y="0" width="34" height="100"/>
                  <text x="17" y="50" class="svg-detail-label"><tspan x="17" dy="-0.6em">Left</tspan><tspan x="17" dy="1.2em">左邊</tspan></text>
                  <rect class="trauma-detail-part" id="trauma-buttocks-back-右邊" x="66" y="0" width="34" height="100"/>
                  <text x="83" y="50" class="svg-detail-label"><tspan x="83" dy="-0.6em">Right</tspan><tspan x="83" dy="1.2em">右邊</tspan></text>
                  <rect class="trauma-detail-part" id="trauma-buttocks-back-中間" x="34" y="0" width="32" height="100"/>
                  <text x="50" y="75" class="svg-detail-label"><tspan x="50" dy="-0.6em">Middle</tspan><tspan x="50" dy="1.2em">中間</tspan></text>
              </svg>`
        }
    }
};

function calculateBurnPercentage() {
    let total = 0;
    document.querySelectorAll('.body-part.burn-selected, .body-part.burn-with-trauma').forEach(part => {
        const percentage = parseFloat(part.dataset.burn || 0);
        total += percentage;
    });
    document.getElementById('burn-percentage-display').textContent = `${total}%`;
    return total;
}

function updateTraumaVisuals() {
    document.querySelectorAll('.body-part').forEach(part => {
        // START: More specific trauma check using side-target and view
        const sideTarget = part.dataset.sideTarget; 
        const view = part.dataset.view;
        let isTrauma = false;

        if (sideTarget && view) {
            const prefix = `trauma-${sideTarget}-${view}-`;
            for (const selection of traumaSelections) {
                if (selection.startsWith(prefix)) {
                    isTrauma = true;
                    break;
                }
            }
        }
        // END: More specific trauma check

        const isBurn = part.classList.contains('burn-selected');

        // Reset all visual state classes
        part.classList.remove('trauma-selected', 'burn-with-trauma');

        if (isBurn && isTrauma) {
            part.classList.add('burn-with-trauma');
        } else if (isTrauma) {
            part.classList.add('trauma-selected');
        } else if (isBurn) {
            part.classList.add('burn-selected');
        }
    });
}


function handleBodyPartClick(event) {
    const part = event.currentTarget;
    if (currentInjuryMode === 'burn') {
        part.classList.toggle('burn-selected');
        calculateBurnPercentage();
    } else {
        const traumaTarget = part.dataset.traumaTarget;
        const sideTarget = part.dataset.sideTarget;
        const view = part.dataset.view;
        if (traumaMap[traumaTarget]) {
            openTraumaModal(traumaTarget, view, sideTarget);
        }
    }
    updateTraumaVisuals();
}

function openTraumaModal(mainPart, clickedView, sideTarget) {
    const modalLabel = document.getElementById('traumaModalLabel');
    const modalBody = document.getElementById('traumaModalBody');
    const partData = traumaMap[mainPart];

    modalLabel.textContent = `詳細創傷部位 - ${partData.front ? partData.front.title : (partData.back ? partData.back.title : '')}`;
    
    let tabsHTML = '';
    let contentHTML = '';
    
    const defaultView = partData.front ? 'front' : 'back';
    const activeView = partData[clickedView] ? clickedView : defaultView;
    
    const generateSvgContent = (view) => {
        if (!partData[view] || !partData[view].svg) return '';
        return partData[view].svg.replace(/id="trauma-(hand|leg|face|chest|buttocks)-/g, `id="trauma-${sideTarget}-`);
    };

    if (partData.front) {
        const isActive = activeView === 'front';
        tabsHTML += `<li class="nav-item" role="presentation"><button class="nav-link ${isActive ? 'active' : ''}" id="front-tab" data-bs-toggle="tab" data-bs-target="#front-pane" type="button" role="tab">正面</button></li>`;
        contentHTML += `<div class="tab-pane fade ${isActive ? 'show active' : ''}" id="front-pane" role="tabpanel">${generateSvgContent('front')}</div>`;
    }
    if (partData.back) {
        const isActive = activeView === 'back';
        tabsHTML += `<li class="nav-item" role="presentation"><button class="nav-link ${isActive ? 'active' : ''}" id="back-tab" data-bs-toggle="tab" data-bs-target="#back-pane" type="button" role="tab">背面</button></li>`;
        contentHTML += `<div class="tab-pane fade ${isActive ? 'show active' : ''}" id="back-pane" role="tabpanel">${generateSvgContent('back')}</div>`;
    }

    modalBody.innerHTML = `
        <ul class="nav nav-tabs" id="traumaTab" role="tablist">${tabsHTML}</ul>
        <div class="tab-content" id="traumaTabContent">${contentHTML}</div>
    `;
    
    modalBody.querySelectorAll('.trauma-detail-part').forEach(part => {
        if (traumaSelections.has(part.id)) {
            part.classList.add('selected');
        }
        part.addEventListener('click', () => {
            part.classList.toggle('selected');
            if (part.classList.contains('selected')) {
                traumaSelections.add(part.id);
            } else {
                traumaSelections.delete(part.id);
            }
        });
    });
    
    traumaModal.show();
}

async function startCamera() {
    try {
        codeReader = new ZXing.BrowserMultiFormatReader();
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length <= 0) throw new Error("找不到攝影機裝置");

        const selectedDeviceId = videoInputDevices[0].deviceId;
        document.getElementById('videoContainer').style.display = 'flex';

        codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', (result, err) => {
            if (result) {
                console.log("找到 QR Code:", result.text);
                processQRCode(result.text);
                stopCamera();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error("解碼錯誤:", err);
                alert('掃描發生錯誤: ' + err);
                stopCamera();
            }
        });
    } catch (error) {
        alert('無法啟動相機：' + error.message);
        console.error('Camera error:', error);
        stopCamera();
    }
}

function stopCamera() {
    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
    document.getElementById('videoContainer').style.display = 'none';
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const codeReaderForFile = new ZXing.BrowserMultiFormatReader();
        const imageUrl = URL.createObjectURL(file);
        const result = await codeReaderForFile.decodeFromImageUrl(imageUrl);
        processQRCode(result.getText());
        URL.revokeObjectURL(imageUrl);
    } catch (error) {
        alert('無法讀取 QR Code：' + error.message);
        console.error('Scan error:', error);
    } finally {
        event.target.value = null;
    }
}
// --- END: QR Code 掃描相關函式 ---

// --- START: Web Crypto and COSE Sign1 ---
async function getOrGenerateKeys() {
    const storedKeys = JSON.parse(sessionStorage.getItem('tcccKeys'));
    if (storedKeys) {
        const privateKey = await crypto.subtle.importKey("jwk", storedKeys.privateKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
        const publicKey = await crypto.subtle.importKey("jwk", storedKeys.publicKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
        return { privateKey, publicKey };
    }
    const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const exportedPrivateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const exportedPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    sessionStorage.setItem('tcccKeys', JSON.stringify({
        privateKey: exportedPrivateKey,
        publicKey: exportedPublicKey
    }));
    console.log("New key pair generated and stored in sessionStorage.");
    return keyPair;
}

async function createCOSESign1(payload) {
    const { privateKey } = await getOrGenerateKeys();
    
    const protectedHeader = { alg: -7, kid: "TCCC-2025-001" }; // ES256
    const protectedHeaderBytes = CBOR.encode(protectedHeader);
    const payloadBytes = CBOR.encode(payload);

    const sigStructureArray = [ "Signature1", protectedHeaderBytes, new Uint8Array(), payloadBytes ];
    const sigStructureBytes = CBOR.encode(sigStructureArray)

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        sigStructureBytes
    );
    
    const coseSign1Array = [ protectedHeaderBytes, {}, payloadBytes, new Uint8Array(signature) ];
    return CBOR.encode(coseSign1Array);
}

async function verifySignature(publicKey, protectedHeaderBytes, payloadBytes, signatureBytes) {
    const sigStructureArray = [ "Signature1", protectedHeaderBytes, new Uint8Array(), payloadBytes ];
    const sigStructureBytes = CBOR.encode(sigStructureArray);

    return await crypto.subtle.verify(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        publicKey,
        signatureBytes,
        sigStructureBytes
    );
}
// --- END: Web Crypto and COSE Sign1 ---

// --- Base45 and Form Logic ---
const BASE45_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
function base45Encode(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i += 2) {
        if (i + 1 < bytes.length) {
            const value = bytes[i] + bytes[i + 1] * 256;
            result += BASE45_ALPHABET[value % 45] + BASE45_ALPHABET[Math.floor(value / 45) % 45] + BASE45_ALPHABET[Math.floor(value / (45 * 45))];
        } else {
            const value = bytes[i];
            result += BASE45_ALPHABET[value % 45] + BASE45_ALPHABET[Math.floor(value / 45)];
        }
    }
    return result;
}
function base45Decode(str) {
    const result = [];
    for (let i = 0; i < str.length; i += 3) {
        if (i + 2 < str.length) {
            const value = BASE45_ALPHABET.indexOf(str[i]) + BASE45_ALPHABET.indexOf(str[i + 1]) * 45 + BASE45_ALPHABET.indexOf(str[i + 2]) * 45 * 45;
            result.push(value % 256, Math.floor(value / 256));
        } else if (i + 1 < str.length) {
            const value = BASE45_ALPHABET.indexOf(str[i]) + BASE45_ALPHABET.indexOf(str[i + 1]) * 45;
            result.push(value);
        }
    }
    return new Uint8Array(result);
}

function collectFormData() {
    const burn_locations = [];
    document.querySelectorAll('.body-part.burn-selected, .body-part.burn-with-trauma').forEach(part => {
        burn_locations.push(part.dataset.burnPart);
    });
    const total_burn_percentage = calculateBurnPercentage();
    const trauma_locations = Array.from(traumaSelections);

    const injuryData = {
        time: document.getElementById('injuryTime').value,
        mechanism: document.getElementById('mechanism').value,
        description: document.getElementById('injuryDescription').value,
        burn_locations,
        total_burn_percentage,
        trauma_locations
    };

    const tqLimbs = ['r_arm', 'r_leg', 'l_arm', 'l_leg'];
    tqLimbs.forEach(limb => {
        const type = document.getElementById(`tq_${limb}_type`).value.trim();
        const time = document.getElementById(`tq_${limb}_time`).value;
        if (type && time) {
            injuryData[`tq_${limb}`] = { type, time };
        }
    });

    const vitals_history = [];
    const vitalsTable = document.getElementById('vitals-table');
    const headerCells = vitalsTable.querySelectorAll('thead th');
    const numCols = headerCells.length - 1;

    for (let i = 1; i <= numCols; i++) {
        const timeInput = headerCells[i].querySelector('input');
        const record = { time: timeInput.value };
        let hasData = false;
        vitalsTable.querySelectorAll('tbody tr').forEach(row => {
            const inputs = row.cells[i].querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input) {
                    const key = input.dataset.key;
                    const value = input.value;
                    if (value) {
                        record[key] = (input.type === 'number') ? parseInt(value) : value;
                        hasData = true;
                    } else {
                        record[key] = null;
                    }
                }
            });
        });
        if (hasData) {
            vitals_history.push(record);
        }
    }
    
    const treatments = [];
    const treatmentIds = ['tourniquet', 'chestSeal', 'npa', 'decompress', 'iv', 'morphine', 'antibiotics', 'hypothermia'];
    treatmentIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            treatments.push(id);
        }
    });

    return {
        version: "1.6",
        timestamp: new Date().toISOString(),
        patient: { 
            battleRoster: document.getElementById('patientBattleRoster').value,
            name: document.getElementById('name').value, 
            service: document.getElementById('service').value,
            unit: document.getElementById('unit').value,
            idLast4: document.getElementById('idLast4').value, 
            bloodType: document.getElementById('bloodType').value, 
            allergies: document.getElementById('allergies').value || "NKDA" 
        },
        injury: injuryData,
        vitals_history,
        treatments: { 
            applied: treatments, 
            other: document.getElementById('otherTreatments').value 
        },
        evacuation: { 
            priority: document.getElementById('evacPriority').value, 
            medicName: document.getElementById('medicName').value 
        }
    };
}

document.getElementById('tcccForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tcccData = collectFormData();
    const jsonString = JSON.stringify(tcccData, null, 2);
    const originalSize = new TextEncoder().encode(jsonString).length;
    const coseSign1Bytes = await createCOSESign1(tcccData);
    const compressed = pako.deflate(coseSign1Bytes);
    const compressedSize = compressed.length;
    const base45Encoded = base45Encode(compressed);
    const qrData = "TC1:" + base45Encoded;
    const qrDataSize = new TextEncoder().encode(qrData).length;
    document.getElementById('outputSection').style.display = 'block';
    document.getElementById('jsonData').innerHTML = `<pre class="overflow-auto" style="max-height: 200px;"><code>${jsonString}</code></pre>`;
    document.getElementById('signedData').textContent = `[Binary COSE_Sign1 Data - ${coseSign1Bytes.byteLength} bytes]`;
    document.getElementById('base45Data').innerHTML = `<pre class="overflow-auto" style="max-height: 200px;"><code>${qrData}</code></pre>`;
    document.getElementById('originalSize').textContent = originalSize;
    document.getElementById('compressedSize').textContent = compressedSize;
    document.getElementById('qrDataSize').textContent = qrDataSize;
    document.getElementById('compressionRatio').textContent = Math.round((1 - compressedSize / originalSize) * 100) + '% / ' + Math.round((1 - qrDataSize / originalSize) * 100) + '%';
    currentName = tcccData.patient.name;
    currentidLast4 = tcccData.patient.idLast4;
    document.getElementById('qrcode').innerHTML = '';
    const opts = { errorCorrectionLevel: 'M', type: 'image/jpeg', quality: 1, margin: 4, color: { dark:"#000000ff", light:"#ffffffff" } };
    QRCode.toCanvas(qrData, opts, function (error, canvas) {
        if (error) throw error;
        var container = document.getElementById('qrcode');
        container.appendChild(canvas);
    });
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });
});

function clearForm() {
    if (confirm('確定要清除所有資料嗎？')) {
        document.getElementById('tcccForm').reset();
        document.querySelectorAll('.btn-check').forEach(cb => cb.checked = false);
        document.getElementById('outputSection').style.display = 'none';
        document.getElementById('scanResult').style.display = 'none';
        initializeVitalsTable(1);
        traumaSelections.clear();
        document.querySelectorAll('.body-part').forEach(part => {
            part.classList.remove('burn-selected', 'trauma-selected', 'burn-with-trauma');
        });
        calculateBurnPercentage();
        updateTraumaVisuals();
        const injuryToggle = document.getElementById('injury-mode-toggle');
        if (injuryToggle.checked) {
            injuryToggle.click();
        }
    }
}

function downloadQRCode() {
    const canvas = document.querySelector('#qrcode canvas');
    if (canvas) {
        const link = document.createElement('a');
        const fileName = `TCCC_QR_${currentName.replace(/\s/g, '_')}_${currentidLast4.replace(/\s/g, '_')}_`;
        link.download = fileName + new Date().getTime() + '.png';
        link.href = canvas.toDataURL();
        link.click();
    }
}

async function verifyData() {
    const base45Data = document.getElementById('base45Data').textContent;
    try {
        const decompressedBytes = pako.inflate(base45Decode(base45Data.replace('TC1:', '')));
        
        const coseSign1Array = CBOR.decode(decompressedBytes);
        const [protectedHeaderBytes, , payloadBytes, signatureBytes] = coseSign1Array;
        
        const { publicKey } = await getOrGenerateKeys();
        const isValid = await verifySignature(publicKey, protectedHeaderBytes, payloadBytes, signatureBytes);

        if (isValid) {
            const payload = CBOR.decode(payloadBytes);
            alert('✅ 簽章驗證成功！\n\n資料完整性已確認。');
            console.log('驗證的資料:', payload);
        } else {
            alert('❌ 簽章驗證失敗！\n\nSignature is invalid.');
        }
    } catch (error) {
        alert('❌ 資料解析失敗！\n\n' + error.message);
        console.error(error);
    }
}

async function processQRCode(qrData) {
    try {
        if (!qrData.startsWith('TC1:')) throw new Error('這不是有效的 TCCC QR Code');
        
        const decompressedBytes = pako.inflate(base45Decode(qrData.replace('TC1:', '')));
        const coseSign1Array = CBOR.decode(decompressedBytes);
        const [protectedHeaderBytes, , payloadBytes, signatureBytes] = coseSign1Array;

        const { publicKey } = await getOrGenerateKeys();
        const isValid = await verifySignature(publicKey, protectedHeaderBytes, payloadBytes, signatureBytes);

        if (isValid) {
            const payload = CBOR.decode(payloadBytes);
            alert('✅ QR Code 讀取與驗證成功！');
            displayDecodedData(payload);
            fillFormFromData(payload); // Corrected function name
        } else {
            throw new Error('簽章驗證失敗');
        }
    } catch (error) {
        alert('QR Code 解析失敗：' + error.message);
        console.error('Process error:', error);
    }
}

// --- Display and Form Fill Logic ---

function displayDecodedData(data) {
    const scanResult = document.getElementById('scanResult');
    const decodedData = document.getElementById('decodedData');
    
    const get = (obj, path, defaultValue = 'N/A') => {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
        return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    };

    let tqHtml = '';
    const tqData = [
        { label: 'R Arm', data: get(data, 'injury.tq_r_arm', null) },
        { label: 'R Leg', data: get(data, 'injury.tq_r_leg', null) },
        { label: 'L Arm', data: get(data, 'injury.tq_l_arm', null) },
        { label: 'L Leg', data: get(data, 'injury.tq_l_leg', null) },
    ];

    const appliedTqs = tqData.filter(tq => tq.data !== null);

    if (appliedTqs.length > 0) {
        tqHtml += '<p><strong>止血帶紀錄:</strong></p><ul>';
        appliedTqs.forEach(tq => {
            tqHtml += `<li>${tq.label}: ${get(tq.data, 'type')} at ${get(tq.data, 'time')}</li>`;
        });
        tqHtml += '</ul>';
    } else {
        tqHtml = '<p><strong>止血帶紀錄:</strong> 無</p>';
    }
    
    // START: Updated injury display logic
    let injurySummaryHtml = '';
    const burnPercentage = get(data, 'injury.total_burn_percentage', null);
    if(burnPercentage !== null && burnPercentage > 0) {
        injurySummaryHtml += `<p><strong>總燒燙傷面積:</strong> ${burnPercentage}%</p>`;
    }

    const traumaLocations = get(data, 'injury.trauma_locations', []);
    if (traumaLocations.length > 0) {
        const traumaLabels = {
            'face-front': '臉部 (正面)', 'face-back': '臉部 (背面)',
            'chest-front': '胸部 (正面)', 'chest-back': '胸部 (背面)',
            'left_hand-front': '左手 (正面)', 'left_hand-back': '左手 (背面)',
            'right_hand-front': '右手 (正面)', 'right_hand-back': '右手 (背面)',
            'left_leg-front': '左腳 (正面)', 'left_leg-back': '左腳 (背面)',
            'right_leg-front': '右腳 (正面)', 'right_leg-back': '右腳 (背面)',
            'buttocks-back': '臀部'
        };
        const groupedTrauma = {};
        traumaLocations.forEach(id => {
            const parts = id.split('-');
            if (parts.length < 4) return;
            const key = `${parts[1]}-${parts[2]}`;
            if (!groupedTrauma[key]) {
                groupedTrauma[key] = [];
            }
            groupedTrauma[key].push(parts.slice(3).join('-'));
        });

        injurySummaryHtml += '<p><strong>創傷部位:</strong></p><ul>';
        for (const key in groupedTrauma) {
            const label = traumaLabels[key] || key;
            const details = groupedTrauma[key].join(', ');
            injurySummaryHtml += `<li>${label}: ${details}</li>`;
        }
        injurySummaryHtml += '</ul>';
    }
    // END: Updated injury display logic


    let vitalsHtml = '<h5>生命徵象紀錄</h5>';
    const vitalsHistory = get(data, 'vitals_history', []);
    if (vitalsHistory.length > 0) {
        vitalsHtml += '<div class="table-responsive"><table class="table table-sm table-striped">';
        vitalsHtml += '<thead><tr><th>時間</th><th>脈搏</th><th>血壓</th><th>呼吸</th><th>血氧</th><th>AVPU</th><th>疼痛</th></tr></thead>';
        vitalsHtml += '<tbody>';
        vitalsHistory.forEach(record => {
            vitalsHtml += `
                <tr>
                    <td>${get(record, 'time')}</td>
                    <td>${get(record, 'pulse')}</td>
                    <td>${get(record, 'blood_pressure_systolic', '')}/${get(record, 'blood_pressure_diastolic', '')}</td>
                    <td>${get(record, 'resp_rate')}</td>
                    <td>${get(record, 'spo2')}%</td>
                    <td>${get(record, 'avpu')}</td>
                    <td>${get(record, 'pain_scale')}</td>
                </tr>
            `;
        });
        vitalsHtml += '</tbody></table></div>';
    } else {
        vitalsHtml += '<p>無生命徵象紀錄</p>';
    }

    let html = `
        <div class="patient-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">掃描結果：傷患資訊</h3>
                <span class="badge ${get(data, 'evacuation.priority', '').toLowerCase() === 'urgent' ? 'text-bg-danger' : 'text-bg-warning'}">
                    ${get(data, 'evacuation.priority')}
                </span>
            </div>
            <p><strong>戰傷編號:</strong> ${get(data, 'patient.battleRoster')}</p>
            <p><strong>姓名:</strong> ${get(data, 'patient.name')} | <strong>ID 末4碼:</strong> ${get(data, 'patient.idLast4')}</p>
            <p><strong>軍種:</strong> ${get(data, 'patient.service')} | <strong>單位:</strong> ${get(data, 'patient.unit')}</p>
            <p><strong>血型:</strong> ${get(data, 'patient.bloodType')} | <strong>過敏史:</strong> ${get(data, 'patient.allergies')}</p>
            <hr>
            ${vitalsHtml}
            <hr>
            <p><strong>受傷時間:</strong> ${new Date(get(data, 'injury.time', new Date())).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
            <p><strong>受傷機制:</strong> ${get(data, 'injury.mechanism')}</p>
            ${injurySummaryHtml}
            ${tqHtml}
            <p><strong>已實施治療:</strong> ${get(data, 'treatments.applied', []).join(', ') || '無'}</p>
            <hr>
            <p><strong>救護員:</strong> ${get(data, 'evacuation.medicName')} | <strong>記錄時間:</strong> ${new Date(get(data, 'timestamp', new Date())).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
        </div>`;
    decodedData.innerHTML = html;
    scanResult.style.display = 'block';
    scanResult.scrollIntoView({ behavior: 'smooth' });
}

function fillFormFromData(data) { // Corrected function name
    const patient = data.patient || {};
    const injury = data.injury || {};
    const treatments = data.treatments || {};
    const evacuation = data.evacuation || {};
    const vitalsHistory = data.vitals_history || [];

    document.getElementById('patientBattleRoster').value = patient.battleRoster || '';
    document.getElementById('name').value = patient.name || '';
    document.getElementById('service').value = patient.service || '';
    document.getElementById('unit').value = patient.unit || '';
    document.getElementById('idLast4').value = patient.idLast4 || '';
    document.getElementById('bloodType').value = patient.bloodType || '';
    document.getElementById('allergies').value = patient.allergies || '';
    document.getElementById('injuryTime').value = injury.time || '';
    document.getElementById('mechanism').value = injury.mechanism || '';
    document.getElementById('injuryDescription').value = injury.description || '';
    
    // 回填燒燙傷
    document.querySelectorAll('.body-part').forEach(part => {
        part.classList.remove('burn-selected', 'trauma-selected', 'burn-trauma-selected');
    });

    if (injury.burn_locations && Array.isArray(injury.burn_locations)) {
        injury.burn_locations.forEach(location => {
            const part = document.querySelector(`.body-part[data-burn-part="${location}"]`);
            if (part) part.classList.add('burn-selected');
        });
    }
    calculateBurnPercentage();

    // 回填創傷
    traumaSelections.clear();
    if (injury.trauma_locations && Array.isArray(injury.trauma_locations)) {
        injury.trauma_locations.forEach(loc => traumaSelections.add(loc));
    }
    updateTraumaVisuals();

    const tqLimbs = ['r_arm', 'r_leg', 'l_arm', 'l_leg'];
    tqLimbs.forEach(limb => {
        const tqData = injury[`tq_${limb}`];
        const typeInput = document.getElementById(`tq_${limb}_type`);
        const timeInput = document.getElementById(`tq_${limb}_time`);
        typeInput.value = tqData ? tqData.type || '' : '';
        timeInput.value = tqData ? tqData.time || '' : '';
        typeInput.dispatchEvent(new Event('input'));
    });
    
    initializeVitalsTable(vitalsHistory.length > 0 ? vitalsHistory.length : 1);
    const headerCells = document.querySelectorAll('#vitals-table thead th');
    vitalsHistory.forEach((record, colIndex) => {
        if (headerCells[colIndex + 1]) {
            headerCells[colIndex + 1].querySelector('input').value = record.time || '';
        }
        document.querySelectorAll('#vitals-table tbody tr').forEach(row => {
            const inputs = row.cells[colIndex + 1].querySelectorAll('input, select');
            inputs.forEach(input => {
                const key = input.dataset.key;
                if (record.hasOwnProperty(key)) {
                    const value = record[key];
                    input.value = value === null || value === undefined ? '' : value;
                }
            });
        });
    });
    
    document.querySelectorAll('.btn-check').forEach(cb => {
        cb.checked = (treatments.applied || []).includes(cb.id);
    });
    document.getElementById('otherTreatments').value = treatments.other || '';
    
    document.getElementById('evacPriority').value = evacuation.priority || '';
    document.getElementById('medicName').value = evacuation.medicName || '';
}

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function loadSampleData() {
    clearForm();
    const sampleData = {
        patientBattleRoster: 'M234-1234', name: '王大明', service: '陸軍',
        unit: '機步234旅', idLast4: '1234', bloodType: 'O+', allergies: 'Penicillin',
        injuryTime: new Date(new Date().getTime() - (60 * 60 * 1000) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        mechanism: 'IED',
        injuryDescription: 'GSW to Right Leg, Tourniquet applied. Multiple shrapnel wounds to torso and left arm.',
        evacPriority: 'Urgent', medicName: '李醫官'
    };
    for (const key in sampleData) {
        if(document.getElementById(key)) {
            document.getElementById(key).value = sampleData[key];
        }
    }
    document.getElementById('decompress').checked = true;
    document.getElementById('iv').checked = true;
    document.getElementById('morphine').checked = true;
    document.getElementById('tq_r_leg_type').value = 'CAT';
    document.getElementById('tq_r_leg_time').value = '09:45';
    document.getElementById('tq_r_leg_type').dispatchEvent(new Event('input'));
    document.querySelector('[data-burn-part="torso_front"]').classList.add('burn-selected');
    document.querySelector('[data-burn-part="right_leg_front"]').classList.add('burn-selected');
    calculateBurnPercentage();
    
    // 範例創傷
    traumaSelections.add('trauma-left_hand-front-手掌');
    traumaSelections.add('trauma-chest-front-右上');
    
    updateTraumaVisuals();
    const vitalsHistory = [
        { time: '09:50', pulse: 130, blood_pressure_systolic: 90, blood_pressure_diastolic: 50, resp_rate: 28, spo2: 91, avpu: 'Pain', pain_scale: 9 },
        { time: '10:05', pulse: 125, blood_pressure_systolic: 95, blood_pressure_diastolic: 55, resp_rate: 26, spo2: 93, avpu: 'Pain', pain_scale: 8 }
    ];
    initializeVitalsTable(vitalsHistory.length);
    const headerCells = document.querySelectorAll('#vitals-table thead th');
    vitalsHistory.forEach((record, colIndex) => {
        if (headerCells[colIndex + 1]) {
            headerCells[colIndex + 1].querySelector('input').value = record.time || '';
        }
        document.querySelectorAll('#vitals-table tbody tr').forEach(row => {
            const inputs = row.cells[colIndex + 1].querySelectorAll('input, select');
            inputs.forEach(input => {
                const key = input.dataset.key;
                if (record.hasOwnProperty(key)) {
                    const value = record[key];
                    input.value = value === null || value === undefined ? '' : value;
                }
            });
        });
    });
    alert('✅ 範例資料已載入！');
}


function setupTQValidation() {
    const tqLimbs = ['r_arm', 'r_leg', 'l_arm', 'l_leg'];
    tqLimbs.forEach(limb => {
        const typeInput = document.getElementById(`tq_${limb}_type`);
        const timeInput = document.getElementById(`tq_${limb}_time`);

        const validate = () => {
            const typeValue = typeInput.value.trim();
            const timeValue = timeInput.value;
            if (typeValue || timeValue) {
                typeInput.required = true;
                timeInput.required = true;
            } else {
                typeInput.required = false;
                timeInput.required = false;
            }
        };
        typeInput.addEventListener('input', validate);
        timeInput.addEventListener('input', validate);
    });
}

// --- START: 生命徵象表格管理 ---
const vitalsMetrics = [
    { label: '脈搏', key: 'pulse', type: 'number', placeholder: 'bpm' },
    { label: '血壓', key: 'bloodPressure' },
    { label: '呼吸', key: 'resp_rate', type: 'number', placeholder: 'bpm' },
    { label: '血氧', key: 'spo2', type: 'number', placeholder: '%' },
    { label: 'AVPU', key: 'avpu', type: 'select' },
    { label: '疼痛指數', key: 'pain_scale', type: 'number', placeholder: '0-10', min:0, max:10 },
];

function initializeVitalsTable(colCount = 1) {
    const table = document.getElementById('vitals-table');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '<th class="vitals-label">項目</th>';
    tbody.innerHTML = '';

    vitalsMetrics.forEach(metric => {
        const row = tbody.insertRow();
        const labelCell = row.insertCell()
        labelCell.textContent = metric.label;
        if (metric.key === 'bloodPressure'){
            labelCell.innerHTML = '血壓<br><small>(收/舒)</small>'
        }
    });

    for (let i = 0; i < colCount; i++) {
        addColumn(i === 0);
    }
}

function addColumn(isFirst = false) {
    const table = document.getElementById('vitals-table');
    const thead = table.querySelector('thead tr');
    if (thead.cells.length > maxVitalsCols) {
        alert(`最多只能新增 ${maxVitalsCols} 筆時間紀錄`);
        return;
    }

    const headerCell = document.createElement('th');
    const timeValue = isFirst ? getCurrentTime() : '';
    headerCell.innerHTML = `<input type="time" class="form-control form-control-sm" value="${timeValue}">`;
    thead.appendChild(headerCell);

    table.querySelectorAll('tbody tr').forEach((row, index) => {
        const metric = vitalsMetrics[index];
        const cell = row.insertCell();
        if (metric.key === 'bloodPressure') {
            cell.innerHTML = `
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control" placeholder="收" data-key="blood_pressure_systolic">
                    <input type="number" class="form-control" placeholder="舒" data-key="blood_pressure_diastolic">
                </div>`;
        } else if (metric.key === 'avpu') {
             const select = document.createElement('select');
             select.className = 'form-select form-select-sm';
             select.dataset.key = metric.key;
             const avpuOptions = {
                '': '選擇...',
                'Alert': 'A (清醒)',
                'Verbal': 'V (聲音)',
                'Pain': 'P (疼痛)',
                'Unresponsive': 'U (無反應)'
             };
             for (const [value, text] of Object.entries(avpuOptions)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = text;
                select.appendChild(option);
             }
             cell.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = metric.type;
            input.className = 'form-control form-control-sm';
            input.placeholder = metric.placeholder || '';
            input.dataset.key = metric.key;
            if (metric.min !== undefined) input.min = metric.min;
            if (metric.max !== undefined) input.max = metric.max;
            cell.appendChild(input);
        }
    });
}

function removeColumn() {
    const table = document.getElementById('vitals-table');
    const thead = table.querySelector('thead tr');
    if (thead.cells.length <= 2) {
        alert('至少需保留一筆時間紀錄');
        return;
    }
    thead.deleteCell(-1);
    table.querySelectorAll('tbody tr').forEach(row => {
        row.deleteCell(-1);
    });
}
// --- END: 生命徵象表格管理 ---


// --- Service Worker Logic ---
document.addEventListener('DOMContentLoaded', () => {
    traumaModal = new bootstrap.Modal(document.getElementById('traumaModal'));
    
    document.querySelectorAll('.body-part').forEach(part => {
        part.addEventListener('click', handleBodyPartClick);
    });

    const injuryToggle = document.getElementById('injury-mode-toggle');
    const injuryLabel = document.getElementById('injury-mode-label');
    injuryToggle.addEventListener('change', (event) => {
        const isTrauma = event.target.checked;
        currentInjuryMode = isTrauma ? 'trauma' : 'burn';
        
        injuryLabel.textContent = isTrauma ? '創傷' : '燒燙傷';
        
        document.getElementById('burn-info').classList.toggle('d-none', isTrauma);
        document.getElementById('trauma-info').classList.toggle('d-none', !isTrauma);
    });

    document.getElementById('traumaModal').addEventListener('hidden.bs.modal', updateTraumaVisuals);

    document.getElementById('injuryTime').value = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    initializeVitalsTable();
    document.getElementById('add-vitals-col').addEventListener('click', () => addColumn(false));
    document.getElementById('remove-vitals-col').addEventListener('click', removeColumn);
    

    let swRegistration = null;
    let currentVersion = 'unknown';
    let newWorkerVersion = 'unknown';

    function showUpdateBanner(registration, oldVerName, newVerName) {
        const notification = document.getElementById('update-notification');
        const updateButton = document.getElementById('update-button');
        const notificationSpan = notification.querySelector('span');
        const oldVerDisplay = oldVerName.split('-').pop() || 'unknown';
        const newVerDisplay = newVerName.split('-').pop() || 'unknown';
        notificationSpan.textContent = `有新版本可用！(當前: ${oldVerDisplay}, 新版: ${newVerDisplay})`;
        notification.style.display = 'flex';
        updateButton.onclick = () => {
            const waitingWorker = registration.waiting;
            if (waitingWorker) {
                waitingWorker.postMessage({ action: 'SKIP_WAITING' });
                notification.style.display = 'none';
            }
        };
    }

    async function checkForUpdate() {
        try {
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                registration = await navigator.serviceWorker.register('./sw.js');
            }
            await registration.update();
            const updatedRegistration = await navigator.serviceWorker.getRegistration();
            if (updatedRegistration && updatedRegistration.waiting) {
                updatedRegistration.waiting.postMessage({ action: 'GET_VERSION', fromUpdateCheck: true });
            } else {
                alert(`您目前使用的已是最新版本 (${currentVersion.split('-').pop() || 'unknown'})。`);
            }
        } catch (error) {
            console.error('Error during update check:', error);
            if (error.name === 'InvalidStateError') {
                alert('Service Worker 狀態異常，嘗試強制更新。這將重新載入頁面。');
                window.location.reload(true);
            } else {
                alert('檢查更新失敗：' + error.message);
            }
        }
    }
    
    window.checkForUpdate = checkForUpdate;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'VERSION') {
                const versionDisplayElement = document.getElementById('version-display');
                const newVersionDisplay = event.data.version.split('-').pop() || 'unknown';
                if (event.data.action === 'GET_VERSION_RESPONSE_FOR_UPDATE_CHECK' && swRegistration && swRegistration.waiting) {
                    newWorkerVersion = event.data.version;
                    showUpdateBanner(swRegistration, currentVersion, newWorkerVersion);
                } else {
                    currentVersion = event.data.version;
                    versionDisplayElement.textContent = `Ver: ${newVersionDisplay}`;
                }
            }
        });

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    swRegistration = registration;
                    console.log('Service Worker registered with scope: ', registration.scope);
                    if (registration.active) {
                        registration.active.postMessage({ action: 'GET_VERSION' });
                    }
                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.addEventListener('statechange', () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    if(swRegistration && swRegistration.waiting) {
                                       installingWorker.postMessage({ action: 'GET_VERSION', fromUpdateCheck: true });
                                    }
                                }
                            });
                        }
                    });
                }).catch(error => {
                    console.log('Service Worker registration failed: ', error);
                });

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload(); 
            });
        });
    }

    setupTQValidation();
    const backToTopButton = document.getElementById("back-to-top");

    let lastScrollTop = 0;
    window.addEventListener("scroll", () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            backToTopButton.classList.add("show");
        } else {
            backToTopButton.classList.remove("show");
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    backToTopButton.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

