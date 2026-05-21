const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_CHUNK_CHARS = 900;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function chunkText(text) {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length > MAX_CHUNK_CHARS && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current.trim().length > 20) chunks.push(current.trim());
  return chunks;
}

function getEffectiveMime(file) {
  const { mimetype, originalname } = file;
  const ext = (originalname || '').split('.').pop().toLowerCase();
  if (mimetype !== 'application/octet-stream') return mimetype;
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return DOCX_MIME;
  if (ext === 'txt') return 'text/plain';
  return mimetype;
}

async function parseFile(file) {
  const mime = getEffectiveMime(file);

  if (mime === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return chunkText(data.text);
  }

  if (mime === DOCX_MIME) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return chunkText(result.value);
  }

  // Plain text / markdown / fallback
  return chunkText(file.buffer.toString('utf8'));
}

module.exports = { parseFile };
