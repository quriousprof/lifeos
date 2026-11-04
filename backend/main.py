"""Entrypoint: `uv run main.py` starts the Life OS backend on :8000.

Honors PORT / HOST / RELOAD env vars (RELOAD=1 for autoreload).
"""

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "0") == "1",
    )


if __name__ == "__main__":
    main()
