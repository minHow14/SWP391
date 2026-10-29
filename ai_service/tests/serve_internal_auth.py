# ai_service/tests/serve_internal_auth.py
"""Run the real AI app on loopback for the cross-service auth test only."""
import os
import socket

import uvicorn

from main import app


def main() -> None:
    """Announce an isolated test listener; inference credentials stay disabled."""
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", int(os.environ.get("AI_TEST_PORT", "0"))))
        listener.listen()
        print(f"AI_TEST_READY {listener.getsockname()[1]}", flush=True)
        server = uvicorn.Server(uvicorn.Config(app, log_level="error", access_log=False))
        server.run(sockets=[listener])


if __name__ == "__main__":
    main()
