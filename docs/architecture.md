# CloudCare System Architecture

This document outlines the architectural blueprints, communication flows, component topologies, and deployment models powering the CloudCare platform.

---

## 1. Overall System Architecture

The CloudCare platform is structured around a decoupled, three-tier cloud-native model deployed on a Kubernetes cluster (K3s) hosted on an AWS EC2 Ubuntu instance.

```mermaid
graph TD
    Client["Client Web Browser\n(Patient / Clinic Staff)"]

    subgraph AWS_EC2 ["AWS EC2 Host (Ubuntu Linux / K3s Cluster)"]
        subgraph IngressLayer ["Ingress & Networking"]
            NodePortSvc["K8s NodePort Service\nPort: 30080"]
        end

        subgraph CloudCareNS ["Kubernetes Namespace: cloudcare"]
            subgraph WebTier ["Web Presentation Tier"]
                FrontPod["Frontend Pods\nNginx 1.25-Alpine + React 18 SPA\nPort: 80"]
            end

            subgraph ServiceMesh ["Internal Service Routing"]
                BackActiveSvc["Service: cloudcare-backend-active\nClusterIP :8000\nSelector: app=cloudcare-backend, version=blue|green"]
            end

            subgraph AppTier ["Application Tier (Blue-Green)"]
                BluePod["Blue Backend Pods (v1)\nFastAPI + Python 3.12-slim\nPort: 8000"]
                GreenPod["Green Backend Pods (v2)\nFastAPI + Python 3.12-slim\nPort: 8000"]
            end

            subgraph DataTier ["Data Persistence Tier"]
                PostgresSvc["Service: cloudcare-postgres\nClusterIP: None (Headless) :5432"]
                PostgresPod["PostgreSQL 16 Alpine\nNon-exposed internal storage"]
                PostgresPVC["PersistentVolumeClaim\npostgres-pvc (2Gi local storage)"]
            end

            subgraph ConfigTier ["Configuration & Secrets"]
                ConfigMap["ConfigMap: cloudcare-config\n(APP_VERSION, DB_NAME, CORS)"]
                K8sSecrets["Secret: cloudcare-secrets\n(POSTGRES_PASSWORD, SECRET_KEY, DB_URL)"]
            end
        end
    end

    Client -->|HTTP /port 30080| NodePortSvc
    NodePortSvc --> FrontPod
    FrontPod -->|HTTP REST /api /health| BackActiveSvc
    BackActiveSvc -.->|Selector: version=blue| BluePod
    BackActiveSvc -.->|Selector: version=green| GreenPod
    BluePod --> PostgresSvc
    GreenPod --> PostgresSvc
    PostgresSvc --> PostgresPod
    PostgresPod --- PostgresPVC

    ConfigMap -.-> BluePod & GreenPod & PostgresPod
    K8sSecrets -.-> BluePod & GreenPod & PostgresPod
```

---

## 2. Request / Response Data Flow

This diagram illustrates the lifecycle of a patient queue request through the presentation, application, and persistence tiers:

```mermaid
sequenceDiagram
    autonumber
    actor User as Clinic Staff
    participant Browser as Browser Client (React SPA)
    participant Nginx as Frontend Pod (Nginx)
    participant Svc as K8s Service (cloudcare-backend-active)
    participant API as Backend Pod (FastAPI)
    participant DB as PostgreSQL Database

    User->>Browser: Enters patient triage record
    Browser->>Nginx: HTTP POST /api/triage (JSON payload)
    Nginx->>Svc: Forward request to :8000
    Svc->>API: Route to active pod (e.g., version=blue)
    API->>API: Validate schema with Pydantic v2
    API->>DB: SQL INSERT INTO patients (...)
    DB-->>API: Row created (ID, created_at)
    API-->>Svc: 201 Created (Triage Ticket JSON)
    Svc-->>Nginx: Forward HTTP response
    Nginx-->>Browser: Deliver JSON response to client
    Browser-->>User: Renders confirmation toast & updates queue
```

---

## 3. CI/CD Pipeline Automation Flow

The continuous integration and continuous deployment pipeline is executed by Jenkins (hosted on a Windows host runner), pushing tested and scanned container artifacts to Docker Hub and applying state changes to K3s via secure SSH.

```mermaid
flowchart TD
    subgraph DeveloperEnvironment ["Developer Environment"]
        DevCode["Code Changes (Git)"]
        GitPush["git push origin main"]
    end

    subgraph JenkinsPipeline ["Jenkins CI/CD Pipeline Stages"]
        S1["1. SCM Checkout & Short SHA Resolution"]
        S2["2. Environment Diagnostics (Tool Versions)"]
        S3["3. Backend Dependencies Installation"]
        S4["4. Backend Tests (Pytest + Coverage + JUnit XML)"]
        S5["5. Frontend Dependencies (npm ci)"]
        S6["6. Frontend Production Build (npm run build)"]
        
        subgraph DevSecOpsStage ["DevSecOps Security Audits"]
            S7["7. Bandit SAST (Python AST analysis)"]
            S8["8. pip-audit (Python dependency CVEs)"]
            S9["9. npm audit (Frontend dependency CVEs)"]
        end

        subgraph DockerPackaging ["Container Packaging & Hardening"]
            S10["10. Docker Build: Backend (python:3.12-slim)"]
            S11["11. Docker Build: Frontend (nginx:alpine)"]
        end

        subgraph SecurityGates ["Automated Security Gate Enforcement"]
            S12{"12. Trivy Scan Backend\nAny CRITICAL CVE?"}
            S13{"13. Trivy Scan Frontend\nAny CRITICAL CVE?"}
            GateFail["PIPELINE BLOCKED\nPublish & Deploy Aborted"]
        end

        subgraph DeploymentPhase ["Artifact Publishing & Cluster Deployment"]
            S14["14. Docker Push to Docker Hub\nTags: short-SHA, demo, latest"]
            S15["15. Remote Deploy to K3s\n(SSH + kubectl set image)"]
            S16["16. Post-Deployment Verification\n(Smoke test /health endpoint)"]
        end
    end

    DevCode --> GitPush --> S1
    S1 --> S2 --> S3 --> S4 --> S5 --> S6
    S6 --> S7 & S8 & S9
    S7 & S8 & S9 --> S10 & S11
    S10 --> S12
    S11 --> S13
    
    S12 -->|Yes| GateFail
    S13 -->|Yes| GateFail
    
    S12 -->|Zero Critical| S14
    S13 -->|Zero Critical| S14
    S14 --> S15 --> S16
```

---

## 4. Blue-Green Deployment Topology

Blue-Green deployment ensures zero downtime and instant recovery. The active service selector switches between the two deployments seamlessly:

```mermaid
graph TB
    subgraph LiveCluster ["CloudCare K8s Active Topology"]
        Svc["Service: cloudcare-backend-active\nSelector: app=cloudcare-backend, version=blue"]
        
        subgraph BlueDeploy ["Blue Environment (Active - v1)"]
            B1["Pod: cloudcare-backend-blue-xxxx\nLabels: version=blue, release=v1\nTraffic: 100%"]
        end

        subgraph GreenDeploy ["Green Environment (Idle / Testing - v2)"]
            G1["Pod: cloudcare-backend-green-yyyy\nLabels: version=green, release=v2\nTraffic: 0%"]
        end
    end

    Svc ==>|Current Route| B1
    Svc -.->|Switched via kubectl patch| G1

    classDef active fill:#d4edda,stroke:#28a745,stroke-width:2px;
    classDef idle fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    class B1 active;
    class G1 idle;
```

### Switching Mechanism:
```powershell
# Patching service selector atomically in Kubernetes:
kubectl patch service cloudcare-backend-active -n cloudcare --type merge -p '{"spec":{"selector":{"app":"cloudcare-backend","version":"green"}}}'
```

---

## 5. Component Relationship Diagram

```mermaid
erDiagram
    CONFIG_MAP ||--o{ BACKEND_POD : "mounts env vars"
    SECRET ||--o{ BACKEND_POD : "injects credentials"
    CONFIG_MAP ||--o{ POSTGRES_POD : "mounts db configuration"
    SECRET ||--o{ POSTGRES_POD : "injects root password"
    
    POSTGRES_PVC ||--|| POSTGRES_POD : "binds /var/lib/postgresql/data"
    
    BACKEND_DEPLOYMENT ||--|{ BACKEND_POD : "manages replica set"
    FRONTEND_DEPLOYMENT ||--|{ FRONTEND_POD : "manages replica set"
    
    ACTIVE_SERVICE ||--o{ BACKEND_POD : "routes traffic by version label"
    NODEPORT_SERVICE ||--|{ FRONTEND_POD : "exposes port 30080"
```
