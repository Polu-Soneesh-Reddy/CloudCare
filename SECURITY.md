# Security Policy

## Scope & Academic Context
CloudCare is an educational research and laboratory project developed to demonstrate cloud-native infrastructure architecture, automated CI/CD pipelines, container hardening, and DevSecOps governance. It is designed to model healthcare IT workflows for engineering demonstration.

---

## Security Controls Implemented

The platform embeds defensive controls across every layer of the Software Development Life Cycle (SDLC):

### 1. Static Application Security Testing (SAST)
- **Tool:** `Bandit`
- **Configuration:** Scans backend Python source files (`backend/app/`) against common vulnerability patterns (B-rules: SQL injection, unsafe shell execution, debug flags, hardcoded passwords, weak cryptography).
- **Execution:** Automated during the CI stage, generating a structured JSON artifact (`security-reports/bandit-report.json`).

### 2. Software Composition Analysis (SCA) & Dependency Auditing
- **Python Backend:** `pip-audit` queries PyPI advisory databases to verify that zero imported third-party packages contain known CVEs.
- **Node.js Frontend:** `npm audit` evaluates the npm dependency graph for transitive vulnerabilities.
- **Execution:** Automated in the pipeline; alerts are reported and archived for audit compliance.

### 3. Container Security & Image Scanning
- **Tool:** `Trivy` (Aqua Security)
- **Scope:** Base OS layers, system libraries, and application dependencies inside generated Docker images.
- **Vulnerability Database:** CVE, NVD, Debian Security Tracker, Alpine SecDB.
- **Enforcement:** Automated quality gate in `Jenkinsfile`.

### 4. Container Runtime Hardening
- **Least Privilege:** Containers execute under non-root users (`UID: 1000` / `appuser`), preventing container escape attacks from gaining host root privileges.
- **Resource Limits:** Strict CPU and memory limits are enforced in Kubernetes manifests to protect against Denial of Service (DoS) and noisy-neighbor resource exhaustion.
- **Network Isolation:** Sensitive workloads (PostgreSQL) are bound to headless ClusterIP services and never exposed via NodePort or Public LoadBalancers.

### 5. Secrets Management
- **Zero Hardcoded Secrets:** Credentials, database passwords, and cryptographic keys are passed dynamically via Kubernetes Secrets or Jenkins Credentials Vault.
- Git ignores `.env` files, SSH keys (`*.pem`, `id_rsa`), and certificate stores (`*.p12`, `*.pfx`).

---

## Security Gate Policy

Our automated CI/CD pipeline enforces strict release gates:

| Gate Check | Evaluation Metric | Pipeline Action | Rationale |
|---|---|---|---|
| **Container Vulnerability (Trivy)** | **CRITICAL Severity Vulnerability** | **BLOCK (Exit Code 1)** | Critical vulnerabilities in container images represent immediate exploit vectors and must be patched prior to deployment. |
| **Container Vulnerability (Trivy)** | HIGH Severity Vulnerability | WARN (Logged in reports) | High severity alerts require remediation in subsequent sprints. |
| **SAST (Bandit)** | HIGH Severity / High Confidence | Advisory Report | Issues documented in build artifacts for developer triage. |
| **Dependency Audit (pip-audit)** | Known CVE in Direct Packages | Advisory Report | Informs platform team of upcoming library version bumps. |
| **Test Suite Quality** | Any Unit / Integration Failure | **BLOCK (Pipeline Aborted)** | Functional regression prevents container build. |

---

## What This System Does NOT Claim

In accordance with academic standards and medical compliance regulations, CloudCare explicitly states:

1. **No HIPAA Compliance:** The system is not certified under the Health Insurance Portability and Accountability Act (HIPAA) Security Rule (45 CFR Part 160 and Part 164).
2. **No Real Patient Data:** The database must only contain synthetic, mock, or randomized test data. Real Protected Health Information (PHI) or Personally Identifiable Information (PII) must never be loaded.
3. **No Clinical Certification:** CloudCare is not a medical device and provides no clinical decision support.
4. **No Production Warranty:** The architecture is intended for educational and laboratory evaluation.

---

## Reporting Security Issues

If you discover a vulnerability or security deficiency in the CloudCare codebase:
1. Please do not open a public issue if disclosing a live exploit against an active demonstration host.
2. For academic review, open an issue labeled `security` on the repository or notify the project instructor.
