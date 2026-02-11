/**
 * UI 控制與事件監聽
 */

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

// --- 事件監聽 ---

clearAllBtn.addEventListener('click', () => {
    if (confirm("確定要移除所有已上傳的檔案嗎？")) {
        selectedFiles = [];
        // 關鍵：重置 file input，確保可以重新上傳相同檔案
        fileInput.value = '';
        renderFileList();
    }
});

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

/**
 * 下載 Zip 檔案
 * @param {Blob} blob 
 * @param {string} filename 
 */
function downloadZip(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
