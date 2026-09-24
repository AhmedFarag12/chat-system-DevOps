# Realtime Chat (NestJS + MongoDB + Redis)

## Setup

1. Put your Atlas password in `.env` (replace `<db_password>` in `MONGODB_URI`) and set a real `JWT_SECRET`.
   In Atlas, also allow your IP under *Network Access*.
2. Start Redis: `docker compose up -d`
3. `npm run start:dev` (default port 3000)

## REST (all except `/auth/*` need `Authorization: Bearer <token>`)

| Method | Path | |
|---|---|---|
| POST | `/auth/register` | `{username, email, password}` -> `{accessToken, user}` |
| POST | `/auth/login` | `{email, password}` |
| GET | `/users/me`, `/users?q=` | profile / search users |
| GET | `/conversations` | my conversations |
| POST | `/conversations/direct` | `{userId}` (idempotent per pair) |
| POST | `/conversations/group` | `{name, userIds[]}` |
| GET | `/conversations/:id/messages?before=<msgId>&limit=` | history, newest first |
| POST | `/conversations/:id/messages/read` | mark read |

## Socket.IO

Connect with `io(url, { auth: { token } })`. The socket auto-joins all your conversation rooms.

Client -> server (all support ack callbacks):
- `message:send` `{conversationId, content}`
- `conversation:join` `{conversationId}` (after creating a new conversation)
- `typing` `{conversationId, isTyping}`
- `message:read` `{conversationId}`
- `presence:get` `{userIds[]}` -> `{ [userId]: boolean }`

Server -> client: `message:new`, `typing`, `message:read`, `presence` `{userId, online}`, `error`.

## Redis usage
- Presence: per-user socket counter (`presence:<userId>`), so multiple tabs work.
- `@socket.io/redis-adapter`: events fan out across multiple server instances.

## Monitoring (Prometheus + Grafana)

The app exposes Node.js process metrics at `GET /metrics`.

- **Docker Compose:** `docker compose up -d` → Prometheus on http://localhost:9090, Grafana on http://localhost:3001 (`admin` / `admin`). The Prometheus data source is already added.
- **Kubernetes:** `kubectl apply -f k8s/monitoring/`, then
  `kubectl -n chat-system port-forward svc/grafana 3001:3000` (and `svc/prometheus 9090` for Prometheus).
- Quick start dashboard: in Grafana, *Dashboards → New → Import* and enter ID `11159` (Node.js Application Dashboard).

## AWS (Terraform)

`terraform/` creates one Ubuntu EC2 server (+ security group for ports 22, 3000, 3001, 9090 and an SSH key pair).

```bash
cd terraform
terraform init
terraform apply        # prints public_ip
```

Put the IP in `ansible/hosts.ini` (`ansible_host=<public_ip> ansible_user=ubuntu`), then run the playbook to deploy.
`terraform destroy` removes everything.
