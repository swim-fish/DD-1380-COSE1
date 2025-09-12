# TCCC 數位簽章 QR Code 系統

**專案網站 (Live Demo):** [http://swim-fish.github.io/DD-1380-COSE1](http://swim-fish.github.io/DD-1380-COSE1 "null")

本專案旨在提供一個符合美國國防部 DD Form 1380 戰術戰傷救護 (TCCC) 卡標準的數位化解決方案。透過一個現代化的網頁介面 (Progressive Web App, PWA)，急救人員可以快速記錄傷患的生命徵象和處置措施，並將這些資訊編碼成一個帶有數位簽章、高度壓縮的 QR Code。

這個 QR Code 可以被後送鏈中的任何人員使用標準的相機進行掃描，以安全、快速地解碼並驗證傷患的完整資訊，確保資料傳遞的即時性、準確性和安全性。

## 專案發想過程

本專案的技術核心源於先前對歐盟數位新冠證明 (EUDCC) 的 QR Code 驗證與簽章流程的研究。最初的構想是將此技術應用於避難所開設時，作為臨時身份證的快速派發系統。

近期在整理救護車到院前表格、9-Line MEDEVAC 等戰傷救護通訊格式時，意識到可以將 EUDCC 成熟的資料處理流程（CBOR/COSE/Base45）應用於 TCCC DD Form 1380 的數位化，解決戰場上紙本記錄不易保存、傳遞與判讀的問題。

然而，此方案在實務應用上仍有挑戰，例如需要搭配能夠快速列印（如使用抗高溫熱感紙）的設備，才能使流程更加順暢。此外，數位簽章憑證的交換與信任鏈管理也是未來需要進一步規劃的課題。

> **參考資料：歐盟數位新冠證明 (EUDCC) 處理流程**
>
> 在 COVID-19 時期，歐盟的 EUDCC 主要用來跨國通行與驗證，其資料處理格式與流程高度標準化，核心是基於 CBOR/COSE/BASE45/QR Code。
>
> 1. **資料收集 (Data Collection)**
>
>     - 各成員國的衛生機構或授權單位收集個人接種、檢測或康復資料。
>
> 2. **資料打包 (CBOR 編碼)**
>
>     - 將資料轉換為一個類 JSON 結構，並使用 CBOR (Concise Binary Object Representation) 進行序列化以縮小體積。
>
> 3. **簽章處理 (COSE Sign1)**
>
>     - 使用 COSE_Sign1 (CBOR Object Signing and Encryption) 格式進行數位簽章，金鑰由成員國的「國家簽章機關 (DSC)」管理。
>
> 4. **編碼與壓縮**
>
>     - 先用 zlib 進行壓縮，再用 Base45 編碼（此為 EUDCC 特別採用的編碼，比 Base64 更適合 QR code）。
>
> 5. **QR Code 生成**
>
>     - 將帶有 `HC1:` (Health Certificate, version 1) 前綴的最終字串寫入 QR Code。
>

## 核心功能

- **標準化資料欄位**: 應用程式的表單完整對應 DD Form 1380 TCCC 卡的必填項目，包含傷患基本資料、受傷機制、生命徵象（可多次記錄）、止血帶應用、治療措施及後送資訊。

- **高效率資料編碼**:

    1. 將填寫的表單資料結構化。
    2. 使用 **CBOR (Concise Binary Object Representation)** 格式將資料序列化為緊湊的二進位格式。
    3. 透過 **Web Cryptography API (ECDSA P-256)** 產生 **COSE_Sign1** 數位簽章，確保資料的完整性與不可否認性。
    4. 使用 **pako.js (zlib)** 對簽章後的二進位資料進行壓縮，大幅減少資料量。
    5. 最後，將壓縮後的二進位資料透過 **Base45** 編碼轉換為適合 QR Code 的字串。

- **離線優先 (Offline-First)**: 本應用程式是一個 PWA，利用 Service Worker 快取所有必要的應用程式資源（HTML, CSS, JavaScript）。一但載入後，即可在完全沒有網路連線的環境下正常運作。

- **即時掃描與驗證**:

    1. 可直接使用裝置相機掃描 QR Code。
    2. 掃描後，應用程式會自動執行反向流程（Base45 解碼 -> zlib 解壓縮 -> COSE 數位簽章驗證）。
    3. 只有在數位簽章驗證成功後，才會顯示傷患的詳細資訊，確保資料未被竄改。

- **跨平台與易用性**: 作為一個網頁應用，它可以在任何支援現代瀏覽器的裝置上運行，無需安裝原生應用程式。介面使用 Bootstrap 5 進行設計，確保在手機、平板和桌上型電腦上都有一致且良好的使用者體驗。

## 技術堆疊

- **前端框架**: 純 HTML, CSS, 和 JavaScript，搭配 **Bootstrap 5** 進行 UI 設計。
- **資料序列化**: [cbor-x](https://github.com/kriszyp/cbor-x "null") 用於高效的 CBOR 編碼與解碼。
- **資料壓縮**: [pako](https://github.com/nodeca/pako "null") (zlib port) 用於資料壓縮。
- **數位簽章**: Web Cryptography API (ECDSA with P-256 curve) 實作 COSE_Sign1 簽章與驗證。
- **QR Code**: [qrcode](https://github.com/soldair/node-qrcode "null") 用於生成 QR Code，[ZXing/library](https://github.com/zxing-js/library "null") 用于掃描 QR Code。
- **離線支援**: 透過 **Service Worker** 實作 PWA，採用 **Stale-While-Revalidate** 快取策略。
- **資料結構定義**: 使用 **Protocol Buffers (`.proto`)** 文件來定義 TCCC 卡片的資料結構，提供清晰的開發藍圖。


## 如何使用

1. **開啟應用程式**: 在瀏覽器中打開 `index.html`。應用程式將自動註冊 Service Worker 並快取所有必要檔案以供離線使用。
2. **填寫資料**: 依照介面上的欄位，填寫傷患的 TCCC 卡資訊。
3. **生成 QR Code**: 點擊「生成 QR Code」按鈕。下方將會顯示 QR Code 以及相關的編碼資料統計。
4. **掃描與驗證**:

    - 使用另一台裝置，或在同裝置上點擊「開啟相機掃描」按鈕。
    - 對準已生成的 QR Code 進行掃描。
    - 應用程式將自動驗證數位簽章並顯示傷患的詳細資訊卡片。


## 檔案結構

- `index.html`: 應用程式的主要 HTML 結構。
- `style.css`: 自訂樣式表。
- `app.js`: 包含所有應用程式邏輯，如表單處理、資料編碼/解碼、簽章/驗證等。
- `sw.js`: Service Worker 檔案，負責 PWA 的離線快取邏輯。
- `manifest.json`: PWA 的設定檔。
- `tccc_card.proto`: Protocol Buffers 格式的資料結構定義檔。
- `icons/`: 存放 PWA 所需的圖示。
