// --- START: QR Code 掃描相關函式 ---
let codeReader = null;
let currentName = '';
let currentidLast4 = '';

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
function str2ab(str) {
    return new TextEncoder().encode(str);
}

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
    const treatments = Array.from(document.querySelectorAll('input[name="treatment"]:checked')).map(cb => cb.id);
    
    // 收集止血帶資料
    const injuryData = {
        time: document.getElementById('injuryTime').value,
        mechanism: document.getElementById('mechanism').value,
        description: document.getElementById('injuryDescription').value
    };

    const tqLimbs = ['r_arm', 'r_leg', 'l_arm', 'l_leg'];
    tqLimbs.forEach(limb => {
        const type = document.getElementById(`tq_${limb}_type`).value.trim();
        const time = document.getElementById(`tq_${limb}_time`).value;
        if (type && time) {
            injuryData[`tq_${limb}`] = { type, time };
        }
    });

    return {
        version: "1.2",
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
        vitals: { 
            pulse: parseInt(document.getElementById('pulse').value) || null, 
            bloodPressureSystolic: document.getElementById('bloodPressureSystolic').value || null, 
            bloodPressureDiastolic: document.getElementById('bloodPressureDiastolic').value || null, 
            respRate: parseInt(document.getElementById('respRate').value) || null, 
            spo2: parseInt(document.getElementById('spo2').value) || null 
        },
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
    document.getElementById('compressionRatio').textContent = Math.round((1 - compressedSize / originalSize) * 100) + '%';
    
    currentName = tcccData.patient.name;
    currentidLast4 = tcccData.patient.idLast4;

    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: qrData, width: 300, height: 300,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });
});

function clearForm() {
    if (confirm('確定要清除所有資料嗎？')) {
        document.getElementById('tcccForm').reset();
        document.getElementById('outputSection').style.display = 'none';
        document.getElementById('scanResult').style.display = 'none';
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
            fillFormFromData(payload);
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

    let html = `
        <div class="patient-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">掃描結果：傷患資訊</h3>
                <span style="padding: 5px 10px; border-radius: 15px; color: white; background-color: ${get(data, 'evacuation.priority', '').toLowerCase() === 'urgent' ? '#e53e3e' : '#f59e0b'};">
                    ${get(data, 'evacuation.priority')}
                </span>
            </div>
            <p><strong>戰傷編號:</strong> ${get(data, 'patient.battleRoster')}</p>
            <p><strong>姓名:</strong> ${get(data, 'patient.name')} | <strong>ID 末4碼:</strong> ${get(data, 'patient.idLast4')}</p>
            <p><strong>軍種:</strong> ${get(data, 'patient.service')} | <strong>單位:</strong> ${get(data, 'patient.unit')}</p>
            <p><strong>血型:</strong> ${get(data, 'patient.bloodType')} | <strong>過敏史:</strong> ${get(data, 'patient.allergies')}</p>
            <hr style="margin: 10px 0;">
            <p><strong>受傷時間:</strong> ${new Date(get(data, 'injury.time', new Date())).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
            <p><strong>受傷機制:</strong> ${get(data, 'injury.mechanism')}</p>
            ${tqHtml}
            <p><strong>已實施治療:</strong> ${get(data, 'treatments.applied', []).join(', ') || '無'}</p>
            <hr style="margin: 10px 0;">
            <p><strong>救護員:</strong> ${get(data, 'evacuation.medicName')} | <strong>記錄時間:</strong> ${new Date(get(data, 'timestamp', new Date())).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
        </div>`;
    decodedData.innerHTML = html;
    scanResult.style.display = 'block';
    scanResult.scrollIntoView({ behavior: 'smooth' });
}

function fillFormFromData(data) {
    const patient = data.patient || {};
    const injury = data.injury || {};
    const vitals = data.vitals || {};
    const treatments = data.treatments || {};
    const evacuation = data.evacuation || {};

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

    const tqLimbs = ['r_arm', 'r_leg', 'l_arm', 'l_leg'];
    tqLimbs.forEach(limb => {
        const tqData = injury[`tq_${limb}`];
        const typeInput = document.getElementById(`tq_${limb}_type`);
        const timeInput = document.getElementById(`tq_${limb}_time`);
        typeInput.value = tqData ? tqData.type || '' : '';
        timeInput.value = tqData ? tqData.time || '' : '';
        typeInput.dispatchEvent(new Event('input'));
    });
    
    document.getElementById('pulse').value = vitals.pulse || '';
    document.getElementById('bloodPressureSystolic').value = vitals.bloodPressureSystolic || '';
    document.getElementById('bloodPressureDiastolic').value = vitals.bloodPressureDiastolic || '';
    document.getElementById('respRate').value = vitals.respRate || '';
    document.getElementById('spo2').value = vitals.spo2 || '';
    
    document.querySelectorAll('.btn-check').forEach(cb => {
        cb.checked = (treatments.applied || []).includes(cb.id);
    });
    document.getElementById('otherTreatments').value = treatments.other || '';
    
    document.getElementById('evacPriority').value = evacuation.priority || '';
    document.getElementById('medicName').value = evacuation.medicName || '';
}

function getCurrentDate() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function loadSampleData() {
    const sampleData = {
        patientBattleRoster: 'BR-101-001',
        name: '王大明',
        service: '陸軍',
        unit: '機步234旅',
        idLast4: '0001', 
        bloodType: 'O+',
        allergies: 'Penicillin', 
        injuryTime: getCurrentDate(),
        mechanism: 'IED', 
        injuryDescription: '右下肢爆炸傷，大量出血',
        pulse: '120', 
        bloodPressureSystolic: '90',
        bloodPressureDiastolic: '60',
        respRate: '24', 
        spo2: '92',
        evacPriority: 'Urgent', 
        medicName: '李醫官'
    };
    for (const key in sampleData) {
        if(document.getElementById(key)) {
            document.getElementById(key).value = sampleData[key];
        }
    }
    // 勾選範例治療
    document.getElementById('tourniquet').checked = true;
    document.getElementById('iv').checked = true;
    document.getElementById('morphine').checked = true;
    
    // 填寫範例止血帶
    document.getElementById('tq_r_leg_type').value = 'CAT';
    document.getElementById('tq_r_leg_time').value = '14:30';
    document.getElementById('tq_r_leg_type').dispatchEvent(new Event('input'));
    alert('✅ 範例資料已載入！您可以直接生成 QR Code 測試。');
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

// --- Service Worker Logic ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('injuryTime').value = getCurrentDate();
    
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
    
    // Make checkForUpdate globally accessible
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

    setupTQValidation(); // 啟用止血帶驗證
});
