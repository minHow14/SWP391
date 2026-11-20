# D:/SWP391/SWP391/ai_service/tests/serve_internal_auth.py
# Script khởi chạy app AI thật trên loopback, chỉ phục vụ test tích hợp xác thực nội bộ
# giữa Back-end và AI Service (Back-end đọc dòng AI_TEST_READY để biết cổng đang lắng nghe).
"""Run the real AI app on loopback for the cross-service auth test only."""
import os
import socket

import uvicorn

from main import app


# Mở socket trên 127.0.0.1 (cổng 0 = để hệ điều hành tự chọn cổng trống), in cổng ra stdout
# rồi chạy uvicorn trên chính socket đó để tránh race condition giữa lúc chọn cổng và lúc bind.
def main() -> None:
    """Announce an isolated test listener; inference credentials stay disabled."""
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", int(os.environ.get("AI_TEST_PORT", "0"))))
        listener.listen()
        print(f"AI_TEST_READY {listener.getsockname()[1]}", flush=True)
        server = uvicorn.Server(uvicorn.Config(app, log_level="error", access_log=False))
        server.run(sockets=[listener])


# Chỉ chạy server khi file được gọi trực tiếp, không chạy khi pytest import.
if __name__ == "__main__":
    main()
