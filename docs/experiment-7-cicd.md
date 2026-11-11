# Experiment 7: Continuous Integration & Continuous Deployment (CI/CD) with Jenkins

## 1. Experiment Overview
- **Title:** Automated CI/CD Pipeline Implementation for CloudCare Microservices on a Windows-hosted Jenkins Server.
- **Objective:** Configure, automate, and execute an enterprise-grade CI/CD pipeline that checks out code, runs automated test suites, performs multi-stage security audits, builds hardened Docker container images, publishes artifacts to Docker Hub, deploys to a remote Kubernetes (K3s) cluster on AWS EC2, and runs post-deployment health verification.
- **Tools Used:** Jenkins 2.440+ (Windows Native), Git, Docker Desktop, Python 3.12, Node.js 20, Trivy, Bandit, pip-audit, PowerShell, OpenSSH, K3s on AWS EC2.

---

## 2. Jenkins Installation on Windows Host

### Step 2.1: Prerequisites Installation
Ensure the following software packages are installed on your Windows machine and available in the system `PATH`:
- **Java Development Kit (JDK 17 or JDK 21):** OpenJDK or Eclipse Temurin.
  ```powershell
  java -version
  ```
- **Git for Windows:**
  ```powershell
  git --version
  ```
- **Docker Desktop for Windows:** Configured for Linux containers.
  ```powershell
  docker --version
  ```
- **Python 3.12:**
  ```powershell
  python --version
  ```
- **Node.js 20 LTS:**
  ```powershell
  node --version
  npm --version
  ```

### Step 2.2: Download & Install Jenkins
1. Download the Windows installer (`jenkins.msi`) from [https://www.jenkins.io/download/](https://www.jenkins.io/download/).
2. Run the MSI installer.
   - Choose a service account or run as `LocalSystem`.
   - Specify port (Default: `8080`).
   - Select the path to your JDK 17/21 installation.
3. Open `http://localhost:8080` in your browser.
4. Unlock Jenkins by retrieving the initial admin password from:
   ```powershell
   Get-Content "C:\Program Files\Jenkins\secrets\initialAdminPassword"
   ```
5. Choose **"Install suggested plugins"** and create your primary admin account.

---

## 3. Required Plugins Configuration

Navigate to **Manage Jenkins** → **Plugins** → **Available Plugins**, and install the following:

| Plugin Name | Plugin ID | Purpose |
|---|---|---|
| **Pipeline** | `workflow-aggregator` | Core Declarative Pipeline engine |
| **Credentials Binding Plugin** | `credentials-binding` | Injects secrets into build steps securely |
| **Git Plugin** | `git` | Integrates with GitHub / Git SCM |
| **SSH Agent Plugin** | `ssh-agent` | Facilitates passwordless SSH deployment to EC2 |
| **JUnit Plugin** | `junit` | Parses `junit-backend.xml` and visualizes test trends |
| **Co育verage / Warnings Next Gen** | `warnings-ng` | (Optional) Parses Bandit and Trivy SARIF reports |

*Restart Jenkins once plugins are installed.*

---

## 4. Credential Configuration (Step-by-Step)

Navigate to **Manage Jenkins** → **Credentials** → **System** → **Global credentials (unrestricted)** → **Add Credentials**.

### 4.1: Docker Hub Credentials
- **Kind:** Username with password
- **Scope:** Global
- **Username:** `YOUR_DOCKERHUB_USERNAME`
- **Password:** *Your Docker Hub Personal Access Token (PAT) or Account Password*
- **ID:** `DOCKER_HUB_CREDS`
- **Description:** Docker Hub authentication token

### 4.2: EC2 SSH Private Key
- **Kind:** SSH Username with private key
- **Scope:** Global
- **ID:** `EC2_SSH_KEY`
- **Username:** `ubuntu`
- **Private Key:** Enter directly → Paste contents of your `.pem` key (e.g., `cloudcare-key.pem`)
- **Passphrase:** *(Leave blank if none)*
- **Description:** SSH Private Key for AWS EC2 K3s Cluster

---

## 5. Jenkins Pipeline Job Setup

### Step 5.1: Create Job
1. Click **New Item** on Jenkins dashboard.
2. Enter Item Name: `CloudCare-Pipeline`.
3. Select **Pipeline** (or **Multibranch Pipeline**) and click **OK**.

### Step 5.2: Configure Pipeline Parameters
Under **General**, enable **This project is parameterized**:
- **String Parameter:** `DOCKER_USERNAME` (Default: `YOUR_DOCKERHUB_USERNAME`)
- **String Parameter:** `EC2_HOST` (Default: `YOUR_EC2_PUBLIC_IP`)
- **String Parameter:** `EC2_USER` (Default: `ubuntu`)
- **Boolean Parameter:** `SKIP_DEPLOY` (Default: `false`)
- **Boolean Parameter:** `SKIP_SECURITY` (Default: `false`)

### Step 5.3: Pipeline Script from SCM
1. In the **Pipeline** section at the bottom, select **Pipeline script from SCM**.
2. **SCM:** Select `Git`.
3. **Repository URL:** Enter your repository URL (or local file URI for demo: `file:///C:/Users/sonee/.gemini/antigravity/scratch/cloudcare`).
4. **Branch Specifier:** `*/main`
5. **Script Path:** `Jenkinsfile`
6. Click **Save**.

---

## 6. Pipeline Walkthrough Stage-by-Stage

```
[Checkout & Version]  -> Resolves short git SHA (e.g. a1b2c3d) for immutable tagging
        ↓
[Environment Setup]   -> Verifies installed CLI tools (Docker, Python, Node, Git)
        ↓
[Backend Dependencies]-> Installs requirements.txt + pytest + security linters
        ↓
[Backend Tests]       -> Runs pytest, produces junit-backend.xml and coverage.xml
        ↓
[Frontend Dep & Build]-> Executes 'npm ci' followed by production 'npm run build'
        ↓
[Security Scanning]   -> SAST (Bandit), Python CVEs (pip-audit), npm audit
        ↓
[Docker Packaging]    -> Builds Backend (python:3.12-slim) & Frontend (nginx:alpine)
        ↓
[Security Gates]      -> Trivy container scan; blocks build if CRITICAL CVE found
        ↓
[Docker Hub Push]     -> Authenticates via credentials vault; pushes SHA and demo tags
        ↓
[Deploy to K3s]       -> Copies manifests via SCP, updates image via kubectl set image
        ↓
[Post-Deploy Verify]  -> Invokes /health endpoint on live EC2 host; confirms 200 OK
```

---

## 7. Expected Outputs and Logs

### Successful Checkout & Version Output:
```
[Pipeline] { (Checkout & Version)
[CloudCare-Pipeline] Running batch script
a1b2c3d
==========================================================
CloudCare Pipeline - Commit SHA: a1b2c3d
Backend Target Image:  devopsuser/cloudcare-backend:a1b2c3d
Frontend Target Image: devopsuser/cloudcare-frontend:a1b2c3d
==========================================================
```

### Successful Test Execution:
```
============================= test session starts =============================
platform win32 -- Python 3.12.2, pytest-8.1.1
collected 8 items

backend/tests/test_health.py .                                           [ 12%]
backend/tests/test_triage.py ...                                         [ 50%]
backend/tests/test_appointments.py ....                                  [100%]

---------- coverage: platform win32, python 3.12.2 -----------
Name                     Stmts   Miss  Cover
--------------------------------------------
backend/app/main.py         42      2    95%
backend/app/models.py       28      0   100%
--------------------------------------------
TOTAL                       70      2    97%
- Generated xml file: junit-backend.xml -
============================== 8 passed in 1.42s ==============================
Recording test results
```

### Successful Trivy Quality Gate:
```
Running Trivy Container Vulnerability Scan on Backend...
2026-10-23T12:00:00.000Z INFO Vulnerability scanning is enabled
2026-10-23T12:00:01.000Z INFO Detected OS: debian
2026-10-23T12:00:02.000Z INFO Number of language-specific files: 1
Total: 0 (CRITICAL: 0)
Trivy Backend Scan PASSED (Zero CRITICAL vulnerabilities).
```

### Successful Deployment & Post-Deploy Verify:
```
Deploying CloudCare manifests to K3s on EC2: 54.210.12.34
deployment.apps/cloudcare-backend image updated
deployment.apps/cloudcare-backend condition met: Deployment has successfully progressed.
Verifying live endpoint health at http://54.210.12.34:8000/health...
Health Check Response: {"status":"healthy","database":"connected","version":"1.0.0"}
Post-deployment smoke test successfully verified!
CloudCare CI/CD Pipeline SUCCEEDED for commit a1b2c3d!
```

---

## 8. What to Show Faculty (Proof of Completion)

To demonstrate successful completion during the viva or lab evaluation:
1. **The Jenkins Stage View / Blue Ocean:**
   - Show all 16 green blocks in the Jenkins pipeline UI.
   - Point out the distinct stages: Test, Security Scan, Docker Build, Trivy Gate, and Deploy.
2. **Test Result Trend:**
   - Click **Test Result** in Jenkins to display the JUnit report showing test execution count, pass percentage, and duration.
3. **Archived Artifacts:**
   - Show the generated and archived files under the build: `security-reports/bandit-report.json`, `security-reports/pip-audit-report.json`, and `junit-backend.xml`.
4. **Docker Hub Repository:**
   - Open your browser to Docker Hub. Show the images tagged with the exact git commit short SHA and the tag `demo`.
5. **Live Verification on EC2:**
   - Run in terminal: `curl http://<EC2-IP>:8000/health` or open browser at `http://<EC2-IP>:30080` to demonstrate the running clinical UI.

---

## 9. Troubleshooting Guide

- **Error: `git rev-parse returned empty string`:** Ensure Git is initialized and has at least one commit (`git commit -m "initial commit"`).
- **Error: `docker: command not found`:** Verify Docker Desktop is running and that `C:\Program Files\Docker\Docker\resources\bin` is added to Windows System Environment Variables `PATH`.
- **Error: `Host key verification failed` during SSH:** In the Jenkinsfile, the SSH commands use `-o StrictHostKeyChecking=no` to prevent interactive prompt blocking on headless execution.
- **Error: `Access Denied` on PowerShell Scripts:** In Windows PowerShell (as Admin), run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
  ```
