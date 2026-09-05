from openai import OpenAI
import numpy as np

from backend.config import get_settings


class OpenAIEmbedder:
    def __init__(self) -> None:
        settings = get_settings()

        self.model = settings.embedding_model
        self.dim = settings.embedding_dim

        self.client = OpenAI(
            base_url=settings.embedding_base_url,
            api_key=settings.embedding_api_key,
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
        )

        vectors = [
            item.embedding
            for item in sorted(response.data, key=lambda item: item.index)
        ]

        if len(vectors) != len(texts):
            raise ValueError(
                f"Expected {len(texts)} embeddings, got {len(vectors)}"
            )

        for vector in vectors:
            if len(vector) != self.dim:
                raise ValueError(
                    f"Expected embedding dimension {self.dim}, "
                    f"got {len(vector)}"
                )

        return vectors

def vector_to_bytes(vector: list[float]) -> bytes:
    array = np.asarray(vector, dtype=np.float32)
    return array.tobytes()

def bytes_to_vector(data: bytes) -> np.ndarray:
    return np.frombuffer(data, dtype=np.float32)

if __name__ == "__main__":
    original = [0.12, -0.03, 0.88]

    data = vector_to_bytes(original)
    restored = bytes_to_vector(data)

    print(type(data))
    print(restored)
    print(restored.dtype)
    print(np.allclose(restored, original))