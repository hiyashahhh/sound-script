"""Document ingestion: parse front matter, clean, chunk with overlap, attach metadata."""
import pathlib, re

KB_DIR = pathlib.Path(__file__).resolve().parents[2] / "knowledge"

def parse_doc(path: pathlib.Path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    if not m:
        raise ValueError(f"{path.name}: missing front matter")
    meta = dict(l.split(": ", 1) for l in m.group(1).splitlines() if ": " in l)
    for key in ("title", "topic", "genre", "source"):
        if key not in meta:
            raise ValueError(f"{path.name}: missing '{key}' in front matter")
    return meta, re.sub(r"[ \t]+", " ", m.group(2)).strip()

def chunk_text(text: str, size: int = 70, overlap: int = 15):
    """Word-based sliding window. size/overlap are in words."""
    if size <= 0 or not 0 <= overlap < size:
        raise ValueError("need size > 0 and 0 <= overlap < size")
    words, step, out = text.split(), size - overlap, []
    for start in range(0, max(len(words), 1), step):
        piece = words[start:start + size]
        if piece:
            out.append(" ".join(piece))
        if start + size >= len(words):
            break
    return out

def load_chunks(size: int = 70, overlap: int = 15, kb_dir=KB_DIR):
    chunks = []
    for path in sorted(pathlib.Path(kb_dir).glob("*.md")):
        meta, body = parse_doc(path)
        for i, piece in enumerate(chunk_text(body, size, overlap)):
            chunks.append({"id": f"{meta['topic']}-{i}", "text": piece, **meta})
    return chunks
