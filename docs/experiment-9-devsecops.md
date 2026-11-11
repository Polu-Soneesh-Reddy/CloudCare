# Experiment 9: DevSecOps Implementation & Automated Security Gates

## 1. Experiment Overview
- **Title:** DevSecOps Automation: Multi-Stage Vulnerability Scanning and Automated Quality Gating in CI/CD.
- **Objective:** Integrate Static Application Security Testing (SAST), Software Composition Analysis (SCA), and Container Vulnerability Scanning into the automated build lifecycle. Implement a definitive security quality gate that automatically halts the pipeline upon detection of `CRITICAL` severity CVEs.
- **Tools Used:** Bandit (Python SAST), pip-audit (Python SCA), npm audit (Node.js SCA), Trivy (Container Vulnerability Scanner), Jenkins, PowerShell.

---

## 2. DevSecOps in Healthcare Systems

In standard web applications, software vulnerabilities can result in data breaches or financial loss. In healthcare platforms:
- **Patient Safety & Data Confidentiality:** Unpatched vulnerabilities risk exposure of sensitive health records and personal data.
- **Service Availability:** Ransomware or denial-of-service vulnerabilities in an emergency admission system can cause catastrophic delays in medical care.
- **Shift-Left Security:** Instead of conducting security assessments manually weeks after release, DevSecOps "shifts security left", inspecting every code commit, third-party library, and container layer before deployment.

---

## 3. Security Tooling Breakdown

CloudCare integrates four specialized security scanners:

| Tool | Category | Target Analyzed | Configuration File | Output Format |
|---|---|---|---|---|
| **Bandit** | SAST (Static Analysis) | Python backend source code (`backend/app/`) | `backend/.bandit` | JSON (`bandit-report.json`) |
| **pip-audit** | SCA (Dependency Scan) | Python libraries (`backend/requirements.txt`) | PyPI Advisory DB / OSV | JSON (`pip-audit-report.json`) |
| **npm audit** | SCA (Dependency Scan) | Node.js libraries (`frontend/package.json`) | npm Security Registry | JSON (`npm-audit-report.json`) |
| **Trivy** | Container Vulnerability | Built Docker Images (`cloudcare-backend`, `cloudcare-frontend`) | CLI args: `--severity CRITICAL` | JSON / SARIF (`trivy-report.json`) |

---

## 4. Security Gate Policy & Enforcement Rules

Our CI/CD pipeline implements a strict **Quality Gate**:

```
           [Docker Image Built]
                    │
                    ▼
          [Run Trivy Image Scan]
          (--severity CRITICAL)
                    │
         ┌──────────┴──────────┐
         │                     │
    [CRITICAL > 0]       [CRITICAL == 0]
         │                     │
         ▼                     ▼
  [EXIT CODE 1]          [EXIT CODE 0]
         │                     │
         ▼                     ▼
 ⛔ GATE FAILED:         ✅ GATE PASSED:
 Pipeline ABORTED        Push to Docker Hub
 Release BLOCKED         Deploy to Kubernetes
```

### Policy Rules:
1. **Container Images (Trivy):** Any unpatched CVE with a severity rating of **CRITICAL** triggers `exit 1`. The pipeline immediately fails, preventing any tag push to Docker Hub or rollout to K3s.
2. **Static Code Analysis (Bandit):** Medium and Low issues produce advisory artifacts. Developers must review these before pull request merges.
3. **Dependencies (pip-audit & npm audit):** Vulnerabilities generate structured reports archived in Jenkins for compliance audits.

---

## 5. Local Security Scan Execution

Developers can run the full DevSecOps suite locally on Windows prior to committing code using the provided script:

```powershell
# Run security scan script
.\scripts\security-scan.ps1 -BackendPath .\backend -ReportDir .\security-reports -ImageName cloudcare-backend:local
```

### Expected Output of Clean Local Scan:
```
=== CloudCare Security Scan ===

[1/4] Bandit Python SAST...
  PASSED

[2/4] pip-audit dependency scan...
  PASSED

[3/4] npm audit frontend dependencies...
  OK

[4/4] Trivy image scan...
  PASSED (no CRITICAL vulnerabilities)

=== Scan Summary ===
Passed: 4 | Failed: 0 | Skipped: 0
Reports saved to: .\security-reports
```

---

## 6. Demonstrating a FAILING Security Gate (Faculty Evaluation)

To demonstrate how the pipeline actively protects production by blocking insecure images:

### Step 6.1: Introduce a Vulnerable Base Image or Package
Temporarily edit `backend/Dockerfile` to use an outdated base image with known critical CVEs (e.g. `python:3.9-slim-buster` or `python:3.8`):

```dockerfile
# Change line 1 of backend/Dockerfile
FROM python:3.8-slim-buster
```

Build the test image:
```powershell
docker build -t cloudcare-backend:vulnerable-test ./backend
```

### Step 6.2: Run Trivy with Gate Enforcement
Execute Trivy scanning with the blocking flag:

```powershell
trivy image --severity CRITICAL --exit-code 1 cloudcare-backend:vulnerable-test
```

### Step 6.3: Observe the Blocked Output
```
2026-10-23T12:15:00.000Z INFO Vulnerability scanning is enabled
2026-10-23T12:15:01.000Z INFO Detected OS: debian (10.13)
2026-10-23T12:15:02.000Z INFO Number of language-specific files: 1

python:3.8-slim-buster (debian 10.13)
=====================================
Total: 4 (CRITICAL: 4)

┌────────────────┬────────────────┬──────────┬──────────────┬───────────────────┬──────────────────────────────────────────────┐
│    Library     │ Vulnerability  │ Severity │ Installed    │    Fixed Version  │                    Title                     │
├────────────────┼────────────────┼──────────┼──────────────┼───────────────────┼──────────────────────────────────────────────┤
│ libcrypto1.1   │ CVE-2023-3817  │ CRITICAL │ 1.1.1n-0+deb │ 1.1.1w-0+deb10u1  │ openssl: excessive time spent checking DH    │
│ libssl1.1      │ CVE-2023-3817  │ CRITICAL │ 1.1.1n-0+deb │ 1.1.1w-0+deb10u1  │ openssl: excessive time spent checking DH    │
│ zlib1g         │ CVE-2022-37434 │ CRITICAL │ 1:1.2.11.dfsg│ 1:1.2.11.dfsg-2+d │ zlib: heap-based buffer over-read in inflate │
└────────────────┴────────────────┴──────────┴──────────────┴───────────────────┴──────────────────────────────────────────────┘

[ERROR] 4 CRITICAL vulnerabilities detected. Exit code 1 returned.
```

### Step 6.4: Pipeline Reaction
In Jenkins, stage **"Trivy Scan Backend"** turns **RED**. The subsequent stages (**Docker Push**, **Deploy to K3s**, and **Post-Deploy Verify**) are automatically skipped, protecting the live cluster.

---

## 7. Passing the Security Gate

### Step 7.1: Apply Remediation
Revert `backend/Dockerfile` to the hardened modern base image:

```dockerfile
FROM python:3.12-slim
```
- The `python:3.12-slim` image is built on Debian Bookworm with latest security patches.
- Re-run the build:
```powershell
docker build -t cloudcare-backend:hardened ./backend
trivy image --severity CRITICAL --exit-code 1 cloudcare-backend:hardened
```

### Step 7.2: Verify Zero Critical Findings
```
cloudcare-backend:hardened (debian 12.5)
=======================================
Total: 0 (CRITICAL: 0)

[SUCCESS] Zero CRITICAL vulnerabilities. Exit code 0 returned.
```
In Jenkins, the stage turns **GREEN**, and the pipeline proceeds to publish the image to Docker Hub and deploy it to Kubernetes.

---

## 8. Sample Security Report Artifacts

### 8.1: Bandit JSON Report Snippet (`security-reports/bandit-report.json`)
```json
{
  "errors": [],
  "generated_at": "2026-10-23T06:30:00Z",
  "metrics": {
    "_totals": {
      "CONFIDENCE.HIGH": 0,
      "CONFIDENCE.LOW": 0,
      "CONFIDENCE.MEDIUM": 0,
      "SEVERITY.HIGH": 0,
      "SEVERITY.LOW": 0,
      "SEVERITY.MEDIUM": 0,
      "loc": 142,
      "nosec": 0
    }
  },
  "results": []
}
```

### 8.2: pip-audit JSON Report Snippet (`security-reports/pip-audit-report.json`)
```json
{
  "dependencies": [
    {
      "name": "fastapi",
      "version": "0.110.0",
      "vulns": []
    },
    {
      "name": "pydantic",
      "version": "2.6.4",
      "vulns": []
    },
    {
      "name": "uvicorn",
      "version": "0.28.0",
      "vulns": []
    }
  ]
}
```

---

## 9. What to Show Faculty (Viva Evaluation Checklist)

1. **Security Policy Documentation:**
   - Present `SECURITY.md` in the repository root and explain the defined gate rules.
2. **Bandit Configuration:**
   - Open `backend/.bandit` and explain how AST checks verify code for SQL injection (B608) and hardcoded secrets (B105/B106).
3. **Jenkinsfile Gate Logic:**
   - Show lines in `Jenkinsfile` where `trivy image --severity CRITICAL --exit-code 1` is called.
   - Explain that `--exit-code 1` returns a non-zero exit status to the shell, which halts Declarative Jenkins pipelines immediately.
4. **Archived Artifacts:**
   - Open Jenkins Build #X, navigate to **Build Artifacts**, download `security-reports/bandit-report.json` and `pip-audit-report.json`, and show that they are archived on every build run.
5. **Live Failing Demo:**
   - Run `trivy image --severity CRITICAL --exit-code 1 python:3.8-slim-buster` in terminal. Show the terminal exit code (`$LASTEXITCODE` is `1`).
   - Run `trivy image --severity CRITICAL --exit-code 1 cloudcare-backend:latest`. Show that the exit code is `0`.
