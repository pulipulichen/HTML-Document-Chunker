pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const downloadAgainBtn = document.getElementById('downloadAgainBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const actionArea = document.getElementById('actionArea');
const statusEl = document.getElementById('status');
const toggleAi = document.getElementById('toggleAi');
const aiSettings = document.getElementById('aiSettings');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');

let selectedFiles = [];
let lastZipBlob = null;
let lastZipName = "chunks.zip";

// --- UI 控制邏輯 ---
function updateUIState() {
    if (selectedFiles.length > 0) {
        clearAllBtn.classList.remove('hidden');
        actionArea.classList.remove('hidden');
    } else {
        clearAllBtn.classList.add('hidden');
        actionArea.classList.add('hidden');
        resultsSection.classList.add('hidden');
        resultsContainer.innerHTML = '';
        downloadAgainBtn.classList.add('hidden');
    }
}

clearAllBtn.addEventListener('click', () => {
    if (confirm("確定要移除所有已上傳的檔案嗎？")) {
        selectedFiles = [];
        // 關鍵：重置 file input，確保可以重新上傳相同檔案
        fileInput.value = '';
        renderFileList();
    }
});
// ------------------

toggleAi.addEventListener('click', () => {
    aiSettings.classList.toggle('hidden');
    toggleAi.textContent = aiSettings.classList.contains('hidden') ? '展開設定' : '隱藏設定';
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    for (let file of files) {
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    }
    // 關鍵：重置 file input，確保可以重新上傳
    fileInput.value = '';
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-slate-50 rounded-lg border';
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-blue-600 font-mono text-xs uppercase bg-white px-2 py-1 rounded shadow-sm">${file.name.split('.').pop()}</span>
                <span class="text-sm truncate max-w-[200px] md:max-w-md">${file.name}</span>
            </div>
            <button class="text-red-500 hover:text-red-700" onclick="removeFile('${file.name}')">移除</button>
        `;
        fileList.appendChild(div);
    });
    updateUIState();
}

window.removeFile = (name) => {
    selectedFiles = selectedFiles.filter(f => f.name !== name);
    // 當單獨移除檔案時，也嘗試清空 input value，以防剛好是移除最後一個上傳的
    if (selectedFiles.length === 0) fileInput.value = '';
    renderFileList();
};

// 資料提取與結構定義
async function extractDataFromFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    try {
        if (ext === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            return { type: 'text', data: fullText };
        }
        else if (['docx', 'doc', 'odt'].includes(ext)) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return { type: 'text', data: result.value };
        }
        else if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            let allJsonRows = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 0, defval: null });

                sheetData.forEach(row => {
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        if (!key.startsWith('__EMPTY') && row[key] !== null && row[key] !== "") {
                            cleanRow[key] = row[key];
                        }
                    });
                    if (Object.keys(cleanRow).length > 0) {
                        allJsonRows.push(JSON.stringify(cleanRow, null, 0));
                    }
                });
            });
            return { type: 'lines', data: allJsonRows };
        }
        else if (['pptx', 'ppt', 'odp'].includes(ext)) {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            let fullText = "";

            const slideFiles = Object.keys(zip.files)
                .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
                    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
                    return numA - numB;
                });

            for (const slide of slideFiles) {
                const content = await zip.files[slide].async('text');
                const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
                if (matches) {
                    const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim();
                    if (slideText) {
                        fullText += slideText + '\n\n';
                    }
                }
            }
            return { type: 'text', data: fullText };
        }
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            const apiKey = document.getElementById('aiApiKey').value;
            const text = apiKey ? await analyzeImage(file) : "[圖片未辨識：請提供 AI API Key]";
            return { type: 'text', data: text };
        }
        else if (['txt', 'md', 'markdown'].includes(ext)) {
            const text = await file.text();
            return { type: 'text', data: text };
        }

        const text = await file.text();
        return { type: 'text', data: text };

    } catch (err) {
        console.error(`解析失敗:`, err);
        return { type: 'text', data: `[解析錯誤: ${file.name}]` };
    }
}

async function analyzeImage(file) {
    const apiKey = document.getElementById('aiApiKey').value;
    const baseUrl = document.getElementById('aiBaseUrl').value;
    const model = document.getElementById('aiModel').value;
    const promptText = document.getElementById('aiPrompt').value;
    const base64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result.split(',')[1]); reader.readAsDataURL(file); });
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: file.type, data: base64 } }] }] };
    const fetchWithRetry = async (retries = 5, delay = 1000) => {
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) { if (retries > 0) { await new Promise(r => setTimeout(r, delay)); return fetchWithRetry(retries - 1, delay * 2); } throw new Error(response.status); }
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "[AI 無法辨識內容]";
    };
    try { return await fetchWithRetry(); } catch (err) { return `[AI 辨識失敗: ${err.message}]`; }
}

// 核心切分邏輯
function performChunking(extractedData, size, overlap, smart) {
    const chunks = [];

    // --- 策略 A: 針對 JSON/Lines 的完整性切分 (Excel/CSV) ---
    if (extractedData.type === 'lines') {
        const lines = extractedData.data;
        let i = 0;

        while (i < lines.length) {
            let currentChunkContent = "";
            let j = i;

            while (j < lines.length) {
                const line = lines[j];
                const potentialLength = currentChunkContent.length + line.length + (currentChunkContent ? 1 : 0);

                if (currentChunkContent.length > 0 && potentialLength > size) {
                    break;
                }

                currentChunkContent += (currentChunkContent ? "\n" : "") + line;
                j++;
            }

            // 移除首尾空白
            const trimmedChunk = currentChunkContent.trim();
            if (trimmedChunk) chunks.push(trimmedChunk);

            if (j >= lines.length) break;

            let nextI = j;
            if (overlap > 0) {
                let overlapCounter = 0;
                let tempK = j - 1;
                while (tempK >= i && overlapCounter < overlap) {
                    overlapCounter += lines[tempK].length;
                    nextI = tempK;
                    tempK--;
                }
                if (nextI <= i) nextI = i + 1;
            } else {
                nextI = j;
            }
            i = nextI;
        }
        return chunks;
    }

    // --- 策略 B: 針對一般文本的 Sliding Window ---
    else {
        let text = extractedData.data.trim(); // 初始清理
        let i = 0;

        if (text.length <= size) {
            return text.length > 0 ? [text] : [];
        }

        while (i < text.length) {
            let end = i + size;

            if (smart && end < text.length) {
                const lookback = Math.floor(size * 0.2);
                const fragment = text.substring(end - lookback, end);
                let lastIdx = -1;
                ['\n', '。', '！', '？', '!', '?', '；', ';'].forEach(p => {
                    const idx = fragment.lastIndexOf(p);
                    if (idx > lastIdx) lastIdx = idx;
                });

                if (lastIdx !== -1) {
                    end = (end - lookback) + lastIdx + 1;
                }
            }

            // 強制 Trim 每個 Chunk
            const chunk = text.substring(i, end).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            if (end >= text.length) break;

            i = end - overlap;
            if (i >= end) i = end - 1;
            if (i < 0) i = 0;
        }
        return chunks;
    }
}

function downloadZip(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

downloadAgainBtn.addEventListener('click', () => {
    if (lastZipBlob) downloadZip(lastZipBlob, lastZipName);
});

processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return alert("請先上傳檔案");
    processBtn.disabled = true;
    clearAllBtn.classList.add('hidden');
    downloadAgainBtn.classList.add('hidden');
    statusEl.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    resultsContainer.innerHTML = '';

    try {
        const zip = new JSZip();
        const chunkSize = parseInt(document.getElementById('chunkSize').value);
        const overlapSize = parseInt(document.getElementById('overlapSize').value);
        const smartSplit = document.getElementById('smartSplit').checked;

        for (const file of selectedFiles) {
            statusEl.textContent = `正在處理: ${file.name}...`;

            const extractedData = await extractDataFromFile(file);
            const chunks = performChunking(extractedData, chunkSize, overlapSize, smartSplit);

            const fileNameNoExt = file.name.replace(/\.[^/.]+$/, "");
            const folder = zip.folder(fileNameNoExt);

            chunks.forEach((chunk, index) => {
                folder.file(`${fileNameNoExt}-chunk-${index + 1}.txt`, chunk);
            });

            // 修正：將 ${c} 緊接在 div 標籤後，避免 whitespace-pre-wrap 渲染出 HTML 縮排的空白
            const previewHtml = `
                <div class="bg-white border rounded-xl overflow-hidden shadow-sm preview-card p-4">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                        <h3 class="font-bold text-lg text-blue-600 truncate max-w-md">${file.name}</h3>
                        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">總計 ${chunks.length} 個分片</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        ${chunks.slice(0, 3).map((c, idx) => `
                            <div class="bg-slate-50 rounded border border-slate-200 flex flex-col overflow-hidden h-80">
                                <div class="bg-slate-200/50 px-3 py-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-widest border-b">Chunk ${idx + 1}</div>
                                <div class="p-3 text-xs text-slate-600 overflow-y-auto custom-scrollbar flex-grow whitespace-pre-wrap leading-relaxed">${c}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', previewHtml);
        }

        resultsSection.classList.remove('hidden');
        statusEl.textContent = "正在生成 Zip 檔案...";

        lastZipBlob = await zip.generateAsync({ type: "blob" });

        const firstFileName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
        const safeName = firstFileName.substring(0, 20);
        lastZipName = `${safeName}_chunks.zip`;

        downloadZip(lastZipBlob, lastZipName);

        downloadAgainBtn.classList.remove('hidden');
        clearAllBtn.classList.remove('hidden');
        statusEl.textContent = "處理完成！檔案已自動下載。";
        setTimeout(() => { if (!statusEl.classList.contains('hidden')) statusEl.classList.add('hidden'); }, 5000);

    } catch (err) {
        console.error(err);
        alert("處理出錯，請查看開發者工具。");
        clearAllBtn.classList.remove('hidden');
    } finally {
        processBtn.disabled = false;
    }
});
