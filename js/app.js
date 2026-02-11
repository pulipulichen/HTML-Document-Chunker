/**
 * 主程式入口，處理流程控制
 */

let lastZipBlob = null;
let lastZipName = "chunks.zip";

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

            // 預覽 HTML 生成
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
