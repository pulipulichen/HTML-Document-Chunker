/**
 * 核心切分邏輯
 */

/**
 * 執行切分
 * @param {Object} extractedData { type: 'text' | 'lines', data: string | string[] }
 * @param {number} size 每個 chunk 的大小
 * @param {number} overlap 重疊大小
 * @param {boolean} smart 是否開啟智慧切分
 * @returns {string[]} 切分後的 chunks
 */
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
