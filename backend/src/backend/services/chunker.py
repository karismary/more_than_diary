from dataclasses import dataclass


@dataclass
class TextChunk:
    seq: int
    content: str
    char_start: int
    char_end: int


def cut_chunks(
    text: str,
    absolute_start: int,
    start_seq: int,
    max_chars: int,
    overlap: int,
) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    local_start = 0
    seq = start_seq

    while local_start < len(text):
        local_end = min(local_start + max_chars, len(text))

        chunks.append(
            TextChunk(
                seq=seq,
                content=text[local_start:local_end],
                char_start=absolute_start + local_start,
                char_end=absolute_start + local_end,
            )
        )

        if local_end == len(text):
            break

        local_start = local_end - overlap
        seq += 1

    return chunks


def chunk_text(
    content: str,
    max_chars: int = 200,
    overlap: int = 20,
) -> list[TextChunk]:
    if not content:
        return []

    if max_chars <= 0:
        raise ValueError("max_chars must be greater than 0")

    if overlap < 0 or overlap >= max_chars:
        raise ValueError("overlap must be between 0 and max_chars")

    result: list[TextChunk] = []
    next_seq = 0
    absolute_start = 0

    for raw_paragraph in content.splitlines(keepends=True):
        paragraph = raw_paragraph.rstrip("\r\n")

        if paragraph:
            paragraph_chunks = cut_chunks(
                text=paragraph,
                absolute_start=absolute_start,
                start_seq=next_seq,
                max_chars=max_chars,
                overlap=overlap,
            )
            result.extend(paragraph_chunks)
            next_seq += len(paragraph_chunks)

        absolute_start += len(raw_paragraph)

    return result
