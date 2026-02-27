"""Honor Railway's PORT and accept both Docker IPv4 and private-network IPv6."""
import os
import socket
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    with socket.create_server(("::", port), family=socket.AF_INET6, dualstack_ipv6=True) as sock:
        uvicorn.run(os.environ.get("APP_MODULE", "app:app"), fd=sock.fileno())
