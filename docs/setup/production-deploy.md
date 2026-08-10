# Guía de Despliegue en Producción (v4.0.0)

Este documento detalla el procedimiento para desplegar la aplicación **MInfra (Versión 4.0.0)** en cualquier servidor Linux (Ubuntu 22.04/24.04, Debian, Oracle Cloud, AWS, DigitalOcean, Hetzner, etc.).

---

## 📋 Requisitos del Servidor

- **OS**: Ubuntu 22.04 LTS o superior / Debian 12
- **CPU / RAM**: Mínimo 1 vCPU, 2 GB RAM (Recomendado 2 vCPU, 4 GB RAM)
- **Servicios**:
  - Python 3.10+
  - Node.js 20+ y `pnpm` o `npm`
  - PostgreSQL 14+
  - Redis 7+
  - Nginx
  - PM2 (`npm install -g pm2`)

---

## 🛠️ Paso 1: Clonar y Preparar Repositorio

```bash
cd /var/www
git clone https://github.com/jamesisla/minfra-kiro.git sdd-project
cd sdd-project
git checkout v4.0.0
```

---

## ⚙️ Paso 2: Variables de Entorno

### Backend (`apps/api/.env`)
Crear el archivo `apps/api/.env`:
```env
PROJECT_NAME="MInfra API"
VERSION="4.0.0"
API_V1_STR="/api/v1"
SECRET_KEY="CAMBIAR_POR_UNA_CLAVE_SECRETA_LARGA_Y_SEGURA"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Base de Datos PostgreSQL (Ajustar credenciales)
POSTGRES_SERVER="localhost"
POSTGRES_USER="sdd_user"
POSTGRES_PASSWORD="tu_password_seguro"
POSTGRES_DB="sdd_prod"
POSTGRES_PORT=5432
DATABASE_URL="postgresql+asyncpg://sdd_user:tu_password_seguro@localhost:5432/sdd_prod"

# CORS (Dominio o IP del servidor)
CORS_ORIGINS=["http://localhost:3000","http://TU_IP_O_DOMINIO","https://TU_IP_O_DOMINIO"]
```

### Frontend (`apps/web/.env.local`)
Crear el archivo `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://TU_IP_O_DOMINIO"
```

---

## 📦 Paso 3: Configurar Backend (FastAPI + AsyncPG)

```bash
cd /var/www/sdd-project/apps/api

# Crear entorno virtual e instalar dependencias
python3 -m venv venv
source venv/bin/activate
pip install -e .

# Aplicar migraciones de base de datos
alembic upgrade head

# (Opcional) Poblar infraestructura y usuario inicial
python -m app.scripts.seed_infrastructure
python -m app.scripts.seed
```

### Crear Servicio Systemd (`/etc/systemd/system/sdd-api.service`)

```ini
[Unit]
Description=FastAPI Service para MInfra
After=network.target postgresql.service redis.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sdd-project/apps/api
ExecStart=/var/www/sdd-project/apps/api/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Habilitar y levantar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sdd-api
sudo systemctl start sdd-api
```

---

## ⚡ Paso 4: Configurar Frontend (Next.js + PM2)

```bash
cd /var/www/sdd-project/apps/web
pnpm install || npm install
pnpm build || npm run build

# Iniciar proceso con PM2
pm2 start npm --name "sdd-web" -- start
pm2 save
pm2 startup
```

---

## 🌐 Paso 5: Nginx Reverse Proxy (`/etc/nginx/sites-available/sdd`)

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    client_max_body_size 50M;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (FastAPI)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Documentación Swagger
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host $host;
    }
}
```

Habilitar sitio y reiniciar Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/sdd /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 Actualizaciones Futuras (Automatizado)

Para actualizar la aplicación a futuras versiones de forma automática:

```bash
cd /var/www/sdd-project
bash scripts/deploy.sh
```
