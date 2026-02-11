/**
 * 檔案解析與文字提取邏輯
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

/**
 * 從檔案中提取資料
 * @param {File} file 
 * @returns {Promise<Object>} { type: 'text' | 'lines', data: string | string[] }
 */
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

/**
 * AI 圖片辨識
 * @param {File} file 
 */
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
