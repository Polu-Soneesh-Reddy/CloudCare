# CloudCare — Cloud-Native Healthcare Operations Platform

> **Smarter Clinic Operations. Better Patient Flow.**  
> An enterprise-grade, cloud-native DevOps demonstration platform built for resilient healthcare operations, zero-downtime blue-green deployments, and end-to-end DevSecOps security gating.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-K3s-326CE5.svg)](https://k3s.io/)
[![CI/CD: Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939.svg)](https://www.jenkins.io/)
[![Security: Trivy](https://img.shields.io/badge/Security-Trivy%20%7C%20Bandit-critical.svg)](https://aquasecurity.github.io/trivy/)

---

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Quick Start (Local Development)](#quick-start-local-development)
6. [Environment Configuration](#environment-configuration)
7. [Database Architecture & Persistence](#database-architecture--persistence)
8. [Testing & Quality Assurance](#testing--quality-assurance)
9. [Docker Containerization](#docker-containerization)
10. [Kubernetes (K3s) Deployment](#kubernetes-k3s-deployment)
11. [Jenkins CI/CD Automation (Windows Host)](#jenkins-cicd-automation-windows-host)
12. [Blue-Green Zero-Downtime Deployment Strategy](#blue-green-zero-downtime-deployment-strategy)
13. [DevSecOps & Automated Security Gates](#devsecops--automated-security-gates)
14. [Troubleshooting & Runbook](#troubleshooting--runbook)
15. [Academic Viva Reference & Disclaimer](#academic-viva-reference--disclaimer)

---

## Executive Overview

**CloudCare** is an end-to-end clinical operations platform designed to coordinate outpatient flow, appointment scheduling, triage queues, and physician allocation. In high-availability healthcare environments, system downtime or unvetted software defects risk patient care and violate operational SLAs.

This project implements modern DevOps and DevSecOps best practices:
- **Zero-Downtime Releases:** Blue-Green deployment architecture with atomic Kubernetes Service label switching and automated instant rollbacks.
- **Automated DevSecOps Pipeline:** SAST scanning (Bandit), software dependency composition analysis (pip-audit, npm audit), and automated container vulnerability gating (Trivy CRITICAL severity blocks release).
- **Hardened Cloud-Native Deployment:** Multi-stage container builds, non-root execution users, CPU/memory limits, liveness and readiness probes, and headless internal database isolation.

---

## Architecture

CloudCare leverages a decoupled microservice-like architecture composed of a single-page React client, an asynchronous FastAPI service layer, and a PostgreSQL persistence engine, orchestrated across a K3s Kubernetes cluster on AWS EC2.

```mermaid
flowchart TD
    subgraph DeveloperWorkstation ["Developer Workstation"]
        Dev["Git Commit / Push"]
    end

    subgraph CI_CD ["Jenkins CI/CD Automation (Windows Runner)"]
        SCM["Checkout Git SHA"]
        LintTest["Pytest & Coverage & Build"]
        SecurityGate["DevSecOps Gate\nBandit SAST | pip-audit | Trivy"]
        DockerHubPush["Docker Hub Push\nTag: short-SHA & demo"]
    end

    subgraph ContainerRegistry ["Docker Hub Registry"]
        HubBack["YOUR_DOCKERHUB/cloudcare-backend"]
        HubFront["YOUR_DOCKERHUB/cloudcare-frontend"]
    end

    subgraph CloudK8s ["Production Environment (AWS EC2 - K3s Cluster)"]
        subgraph IngressTraffic ["Traffic Entry"]
            NodePort["NodePort Service :30080"]
        end

        subgraph K8sNamespace ["Namespace: cloudcare"]
            FrontPod["Frontend Pod (Nginx)\nPort: 80"]
            ActiveSvc["Service: cloudcare-backend-active\nSelector: version=blue/green"]
            
            subgraph BlueGreenDeployments ["Blue-Green Deployments"]
                BluePod["Blue Deployment (v1)\nFastAPI Port: 8000"]
                GreenPod["Green Deployment (v2)\nFastAPI Port: 8000"]
            end

            HeadlessDB["Postgres Service\nClusterIP: None :5432"]
            DBPod["PostgreSQL 16 Alpine\nPVC: 2Gi Persistent Storage"]
        end
    end

    Dev -->|git push| SCM
    SCM --> LintTest --> SecurityGate --> DockerHubPush
    DockerHubPush --> HubBack & HubFront
    DockerHubPush -->|SSH / Kubectl Apply| CloudK8s

    NodePort --> FrontPod
    FrontPod -->|API Calls :8000| ActiveSvc
    ActiveSvc -.->|Selector=blue| BluePod
    ActiveSvc -.->|Selector=green| GreenPod
    BluePod & GreenPod --> HeadlessDB
    HeadlessDB --> DBPod
```

### Data Flow
1. **User Interaction:** Client browser requests the Web UI via HTTP `http://<EC2-IP>:30080`.
2. **Web Server:** Nginx serves pre-compiled static React assets and forwards REST requests to the backend.
3. **API Routing:** REST requests hit `cloudcare-backend-active` Service (`:8000`) within the cluster network.
4. **Active Backend Pod:** The active deployment (`blue` or `green`) processes authentication, validation, and business logic.
5. **Database Queries:** Backend connects via internal DNS `cloudcare-postgres:5432` to the isolated PostgreSQL database instance.

---

## Technology Stack

| Layer | Component | Version / Technology | Key Features |
|---|---|---|---|
| **Frontend** | React SPA | React 18, Vite, TailwindCSS | Real-time queue dashboard, patient triage interface |
| **Backend** | REST API | Python 3.12, FastAPI, Pydantic v2 | High-throughput async handlers, automatic OpenAPI docs |
| **Database** | Relational DB | PostgreSQL 16 Alpine | Persistent volume storage, ACID compliance |
| **Container Engine** | Containers | Docker, Docker Compose | Multi-stage caching, minimal alpine/slim base images |
| **CI/CD** | Automation Server | Jenkins (Windows Native) | PowerShell & Batch scripting, credentials vaulting |
| **DevSecOps** | Security Suite | Trivy, Bandit, pip-audit, npm audit | Policy gating (CRITICAL vulnerability block) |
| **Orchestration** | Kubernetes | K3s Lightweight K8s on AWS EC2 | Blue-Green routing, health probes, resource quotas |

---

## Project Structure

```
cloudcare/
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Jenkinsfile
├── README.md
├── SECURITY.md
├── backend/
│   ├── .bandit
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   └── tests/
│       └── test_health.py
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── src/
│   └── vite.config.js
├── k8s/
│   ├── base/
│   │   ├── 00-namespace.yaml
│   │   ├── 01-configmap.yaml
│   │   ├── 02-secret-example.yaml
│   │   ├── 03-postgres-pvc.yaml
│   │   ├── 04-postgres.yaml
│   │   ├── 05-backend.yaml
│   │   └── 06-frontend.yaml
│   └── blue-green/
│       ├── blue-deployment.yaml
│       ├── green-deployment.yaml
│       └── service-active.yaml
├── scripts/
│   ├── deploy-blue.ps1
│   ├── deploy-green.ps1
│   ├── rollback.ps1
│   ├── security-scan.ps1
│   ├── switch-traffic.ps1
│   └── verify-version.ps1
└── docs/
    ├── architecture.md
    ├── experiment-7-cicd.md
    ├── experiment-8-blue-green.md
    ├── experiment-9-devsecops.md
    └── viva-questions.md
```

---

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose v2.20+
- Python 3.12+
- Node.js 20+ & npm 10+
- PowerShell 7+ or Windows PowerShell 5.1

### Running with Docker Compose
To boot the full multi-tier platform (PostgreSQL, FastAPI Backend, React Frontend):

```powershell
# 1. Clone repository & copy environment configuration
git clone https://github.com/YOUR_ORG/cloudcare.git
cd cloudcare
Copy-Item .env.example .env

# 2. Start all services in detached mode
docker-compose up -d --build

# 3. Verify container health status
docker-compose ps
```

Access the interfaces:
- **Frontend Portal:** `http://localhost:80`
- **Backend API:** `http://localhost:8000`
- **Swagger / OpenAPI Documentation:** `http://localhost:8000/docs`
- **Health Endpoint:** `http://localhost:8000/health`

### Local Development Without Docker

#### Backend:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend:
```powershell
cd frontend
npm install
npm run dev
```

---

## Environment Configuration

Configuration is managed strictly using environment variables. Never commit `.env` files into source control.

| Variable | Default Value | Description |
|---|---|---|
| `POSTGRES_DB` | `cloudcare` | Name of the relational database |
| `POSTGRES_USER` | `cloudcare` | Superuser username for PostgreSQL |
| `POSTGRES_PASSWORD` | `changeme_use_a_strong_password` | Database password |
| `DATABASE_URL` | `postgresql://...` | Connection URI for backend SQLAlchemy pool |
| `SECRET_KEY` | `changeme_generate_with_openssl...` | JWT/HMAC token signing secret |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:80` | Allowed origins for cross-origin resource sharing |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL embedded into frontend Vite bundle |
| `APP_VERSION` | `1.0.0` | Semantic build/runtime version string |

---

## Database Architecture & Persistence

- **Engine:** PostgreSQL 16 Alpine.
- **Kubernetes Persistence:** A 2Gi `PersistentVolumeClaim` (`postgres-pvc`) binds to the local storage class on K3s, ensuring database writes survive pod restarts, evictions, or node reboots.
- **Headless Internal Service:** Exposed exclusively inside cluster DNS at `cloudcare-postgres.cloudcare.svc.cluster.local:5432`. No public ingress or NodePort is attached to PostgreSQL for maximum security.
- **Health Probes:** Equipped with `pg_isready -U cloudcare` probes on readiness and liveness cycles.

---

## Testing & Quality Assurance

Automated unit, integration, and contract tests are executed on every build:

```powershell
# Run backend pytest suite with JUnit reporting and coverage
python -m pytest backend/tests -v --junitxml=junit-backend.xml --cov=backend/app --cov-report=term-missing --cov-report=xml:coverage.xml
```

Pipeline integration:
- Tests produce `junit-backend.xml` which is parsed by Jenkins JUnit plugin.
- Code coverage is captured as `coverage.xml`. Any failing test aborts the pipeline prior to container packaging.

---

## Docker Containerization

Both container images are engineered for minimal attack surface and small image size:

### Backend Image (`backend/Dockerfile`)
- Base: `python:3.12-slim`
- User: Dedicated unprivileged non-root user `appuser` (UID: 1000).
- Caching: Layered copy of `requirements.txt` to leverage Docker build cache.
- Size: ~180MB.

### Frontend Image (`frontend/Dockerfile`)
- Stage 1 (Builder): `node:20-alpine` builds minified production assets via `npm run build`.
- Stage 2 (Runner): `nginx:alpine` delivers static bundles and handles client-side SPA routing (`try_files $uri $uri/ /index.html`).
- Size: ~25MB.

---

## Kubernetes (K3s) Deployment

The project contains declarative manifests under `k8s/base/`:

```powershell
# Apply all core manifests
kubectl apply -f k8s/base/00-namespace.yaml
kubectl apply -f k8s/base/01-configmap.yaml
# Create real secrets in cloudcare namespace (never commit actual secrets)
kubectl create secret generic cloudcare-secrets `
  --namespace=cloudcare `
  --from-literal=POSTGRES_PASSWORD='StrongPassword123!' `
  --from-literal=DATABASE_URL='postgresql://cloudcare:StrongPassword123!@cloudcare-postgres:5432/cloudcare' `
  --from-literal=SECRET_KEY='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

kubectl apply -f k8s/base/03-postgres-pvc.yaml
kubectl apply -f k8s/base/04-postgres.yaml
kubectl apply -f k8s/base/05-backend.yaml
kubectl apply -f k8s/base/06-frontend.yaml
```

Verify status:
```powershell
kubectl get pods,svc,pvc -n cloudcare
```

---

## Jenkins CI/CD Automation (Windows Host)

The `Jenkinsfile` is engineered specifically for Windows nodes running Jenkins, utilizing `bat` and `powershell` steps without POSIX shell dependencies.

### Required Jenkins Plugins
1. **Pipeline** (`workflow-aggregator`)
2. **Git Plugin**
3. **Credentials Binding Plugin**
4. **JUnit Plugin**
5. **Warnings Next Generation Plugin** (optional, for SARIF reporting)

### Required Jenkins Credentials
- `DOCKER_HUB_CREDS` (Username with Password): Credentials for pushing to Docker Hub.
- `EC2_SSH_KEY` (SSH Username with private key): Private key to authenticate to the K3s host (`ubuntu@<EC2-IP>`).

### Jenkins Job Configuration
1. Create a new **Pipeline** job: `CloudCare-Pipeline`.
2. Set Build Triggers: Poll SCM or GitHub webhook (`/github-webhook/`).
3. Select **Pipeline script from SCM**, choose Git, and point to repository URL.
4. Specify script path: `Jenkinsfile`.

---

## Blue-Green Zero-Downtime Deployment Strategy

Blue-Green deployment mitigates deployment risks by running two identical production environments:

- **Blue Environment:** Serves active user traffic (`cloudcare-backend-blue`).
- **Green Environment:** Staging environment where the new release is deployed, pre-warmed, and verified (`cloudcare-backend-green`).
- **Active Service:** `cloudcare-backend-active` routes traffic based on the pod selector `version: blue` or `version: green`.

### Automation Scripts

| Script | Purpose |
|---|---|
| `scripts/deploy-blue.ps1` | Updates image tag on the Blue deployment and waits for rollout |
| `scripts/deploy-green.ps1` | Updates image tag on the Green deployment and waits for rollout |
| `scripts/switch-traffic.ps1` | Validates target readiness, then patches `cloudcare-backend-active` selector |
| `scripts/rollback.ps1` | Detects currently active version and reverses traffic instantly |
| `scripts/verify-version.ps1` | Queries live endpoints and displays cluster selector and pod states |

### Execution Example:
```powershell
# 1. Deploy new version v2 to Green
.\scripts\deploy-green.ps1 -ImageTag v2

# 2. Switch live traffic to Green
.\scripts\switch-traffic.ps1 -Target green

# 3. If an anomaly is identified, execute instant rollback
.\scripts\rollback.ps1
```

---

## DevSecOps & Automated Security Gates

CloudCare embeds a multi-layered security evaluation model directly into the CI/CD pipeline:

```mermaid
flowchart LR
    A[Code Push] --> B[Bandit SAST\nCode Vulnerabilities]
    A --> C[pip-audit / npm audit\nKnown CVEs]
    B --> D[Docker Build]
    C --> D
    D --> E[Trivy Container Scan]
    E -->|CRITICAL CVE = 0| F[Docker Hub Publish & Deploy]
    E -->|CRITICAL CVE > 0| G[PIPELINE BLOCKED\nRelease Aborted]
```

### Security Policy Enforcement
1. **SAST (Bandit):** Scans Python codebase for SQL injections, unsafe deshelling, and hardcoded keys. (Non-blocking advisory report archived in Jenkins).
2. **SCA (pip-audit & npm audit):** Cross-references dependencies against vulnerability databases (PyPI Advisory Database and OSV).
3. **Container Vulnerability (Trivy):** 
   - Gate Rule: **Zero CRITICAL vulnerabilities permitted.**
   - If a CRITICAL CVE is found with a known fix in base OS packages or dependencies, the pipeline exits with code `1`, halting deployment.

---

## Troubleshooting & Runbook

### Common Issues and Remediation

#### 1. `ImagePullBackOff` / `ErrImagePull`
- **Cause:** Incorrect image tag, missing Docker Hub repository permissions, or private repository credentials missing.
- **Fix:** Ensure image is pushed to Docker Hub and public or create a `docker-registry` secret:
  ```powershell
  kubectl describe pod <pod-name> -n cloudcare
  ```

#### 2. `CrashLoopBackOff` on Backend Pod
- **Cause:** Database connection failure or unapplied secrets.
- **Fix:** Verify `cloudcare-secrets` exist and PostgreSQL pod is healthy:
  ```powershell
  kubectl logs -n cloudcare deployment/cloudcare-backend --tail=50
  kubectl get pods -n cloudcare -l app=cloudcare-postgres
  ```

#### 3. Frontend Cannot Connect to Backend (CORS Error)
- **Cause:** `CORS_ORIGINS` in `k8s/base/01-configmap.yaml` does not match the public IP or domain of your EC2 instance.
- **Fix:** Update `CORS_ORIGINS` with the public URL and restart backend pods:
  ```powershell
  kubectl rollout restart deployment/cloudcare-backend -n cloudcare
  ```

#### 4. Traffic Switch Fails with "Deployment is not ready"
- **Cause:** `scripts/switch-traffic.ps1` prevents switching if target pods are crashing or unready.
- **Fix:** Run `kubectl get pods -n cloudcare` to verify health before re-running the switch script.

---

## Academic Viva Reference & Disclaimer

This project is constructed to satisfy comprehensive academic requirements for Cloud Computing, DevOps Engineering, and DevSecOps course curricula.

- **Experiment 7 Guide:** Refer to [`docs/experiment-7-cicd.md`](docs/experiment-7-cicd.md)
- **Experiment 8 Guide:** Refer to [`docs/experiment-8-blue-green.md`](docs/experiment-8-blue-green.md)
- **Experiment 9 Guide:** Refer to [`docs/experiment-9-devsecops.md`](docs/experiment-9-devsecops.md)
- **Comprehensive Viva Q&A (40+ Questions):** Refer to [`docs/viva-questions.md`](docs/viva-questions.md)

### Academic Disclaimer
CloudCare is an educational simulation framework engineered for demonstrating containerization, continuous integration, and infrastructure automation. It does not claim HIPAA, GDPR, or ISO 27001 regulatory compliance, and should not be utilized in production clinical healthcare environments with real patient health information (PHI).
