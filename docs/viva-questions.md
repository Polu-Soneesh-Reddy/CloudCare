# Comprehensive Viva Voce Questions & Answers (48 Questions)

> **Course:** DevOps, Cloud Computing & DevSecOps  
> **Project:** CloudCare — Cloud-Native Healthcare Operations Platform  
> **Target Audience:** B.Tech Computer Science / Information Technology Students

---

## Section 1: Git & Version Control (5 Questions)

### Q1: What is the purpose of `.gitignore` and why must `.env` files be excluded from source control?
**Answer:**  
`.gitignore` specifies intentionally untracked files that Git should ignore (e.g., virtual environments, build artifacts, compiled bytecode, and sensitive credentials).  
`.env` files contain sensitive operational secrets such as database passwords (`POSTGRES_PASSWORD`), API keys, and cryptographic secret tokens (`SECRET_KEY`). Committing `.env` into version control exposes credentials to unauthorized repository access and commits secrets permanently into Git history, creating major security vulnerabilities. Instead, a sanitized template file (`.env.example`) is committed.

### Q2: Why does our Jenkins CI/CD pipeline tag Docker images with the short Git commit SHA instead of just `latest`?
**Answer:**  
The `latest` tag is mutable and non-deterministic; pushing a new build overwrites `latest`, making it impossible to know exactly which source code commit is currently running in production.  
Using the short Git commit SHA (`git rev-parse --short HEAD`, e.g., `a1b2c3d`) creates an **immutable, traceable link** between the deployed container artifact and the exact commit in the Git repository. This enables precise audits, clear version identification, and deterministic rollbacks.

### Q3: What is the difference between `git merge` and `git rebase`?
**Answer:**  
`git merge` creates a new merge commit combining the histories of two branches, preserving the exact chronological sequence and branch structure.  
`git rebase` rewrites project history by taking all new commits on the feature branch and replaying them on top of the target branch, producing a linear, clean commit history. In production CI/CD environments, linear history simplifies bisecting and debugging regressions.

### Q4: How does a Git pre-commit hook contribute to DevSecOps?
**Answer:**  
A pre-commit hook runs automated checks (such as linters, unit tests, or secret detection tools like Gitleaks or TruffleHog) on the developer's local machine before a commit is created. This prevents sensitive credentials, unformatted code, or syntax errors from entering the repository, enforcing quality at the earliest stage of the SDLC.

### Q5: What is the difference between Git and GitHub?
**Answer:**  
**Git** is a distributed command-line version control system installed locally on a computer to record changes to files over time.  
**GitHub** is a cloud-hosted SaaS platform built on top of Git that provides remote repository hosting, access control, pull request collaboration workflows, issue tracking, and webhook integration for external CI/CD systems like Jenkins.

---

## Section 2: Docker & Containerization (8 Questions)

### Q6: What is a container and how does it differ from a Virtual Machine (VM)?
**Answer:**  
A **Virtual Machine** virtualizes physical hardware via a Hypervisor (Type 1 or Type 2) and runs a complete guest operating system, which requires significant CPU, RAM, and storage overhead.  
A **Container** is an isolated user-space process running on the host OS kernel using Linux kernel namespaces (for isolation) and cgroups (for resource limitation). Containers share the host kernel, making them lightweight (megabytes vs. gigabytes), fast to boot (milliseconds vs. minutes), and highly efficient in resource utilization.

### Q7: Why did we use multi-stage builds in the Frontend `Dockerfile`?
**Answer:**  
Multi-stage builds separate the build environment from the runtime environment.  
- **Stage 1 (Builder):** Uses a full `node:20-alpine` environment with npm, devDependencies, and build tooling to compile React assets into minified static HTML/JS/CSS.
- **Stage 2 (Runtime):** Copies *only* the compiled static files into a clean `nginx:alpine` image (~25MB), leaving behind Node.js, source code, and npm dependencies.  
This minimizes image size by over 80% and drastically reduces the security attack surface.

### Q8: What is the purpose of `.dockerignore`?
**Answer:**  
`.dockerignore` prevents unnecessary or sensitive files (such as `.git/`, `node_modules/`, `venv/`, `__pycache__/`, `tests/`, and local `.env` files) from being copied into the Docker build context. This speeds up build times, keeps the resulting image compact, and prevents credentials or test caches from leaking into the container layers.

### Q9: Why is running containers as a non-root user a critical security best practice?
**Answer:**  
By default, Docker processes inside containers execute as root (`UID: 0`). If an attacker finds a remote code execution (RCE) vulnerability or container breakout exploit (e.g., kernel privilege escalation), they inherit root privileges on the underlying host system. Running containers under a dedicated non-root user (`UID: 1000` / `appuser`) enforces the principle of least privilege and limits exploit potential.

### Q10: What is the difference between `COPY` and `ADD` in a Dockerfile?
**Answer:**  
`COPY` simply duplicates local files and directories from the build context into the container filesystem.  
`ADD` has additional capabilities: it can download files from remote URLs and automatically extract local tar archives (`.tar.gz`). In standard DevOps practice, `COPY` is preferred because it is explicit, predictable, and less prone to security vulnerabilities.

### Q11: Explain the difference between `CMD` and `ENTRYPOINT` in a Dockerfile.
**Answer:**  
`ENTRYPOINT` defines the base executable that will always be invoked when the container starts (e.g., `uvicorn` or `python`).  
`CMD` provides default arguments to that executable, which can be easily overridden by passing arguments at runtime (`docker run <image> <new-args>`).

### Q12: How does Docker build layer caching work, and how did we optimize it?
**Answer:**  
Docker executes Dockerfile instructions from top to bottom. Each instruction creates a read-only layer. If an instruction and the files it references haven't changed, Docker reuses the cached layer.  
We optimized this by copying package manifests (`requirements.txt` / `package.json`) and running `pip install` / `npm install` **before** copying the application source code. Consequently, editing source code does not invalidate the dependency installation layer, reducing build times from minutes to seconds.

### Q13: What is the role of Docker Compose in CloudCare?
**Answer:**  
Docker Compose is an orchestration tool for defining and running multi-container applications locally using a single YAML file (`docker-compose.yml`). It coordinates the lifecycle of our PostgreSQL database, FastAPI backend, and React frontend, automatically configuring shared virtual bridge networks, volume mounts, and service health checks for local development.

---

## Section 3: CI/CD & Jenkins (8 Questions)

### Q14: What is the fundamental difference between Continuous Integration (CI) and Continuous Deployment (CD)?
**Answer:**  
**Continuous Integration (CI):** Developers merge code changes frequently into a shared repository. Each commit triggers automated builds, unit tests, and security audits to identify defects early.  
**Continuous Deployment (CD):** Takes validated code from CI and automatically deploys it into production without manual intervention if all tests and security gates pass. (Continuous Delivery requires a manual approval step before production deployment).

### Q15: Why did our `Jenkinsfile` use `bat` and `powershell` steps instead of `sh`?
**Answer:**  
Our Jenkins master/node is installed natively on Windows. The `sh` step requires a Unix POSIX shell (`/bin/sh` or `/bin/bash`), which is not present in standard Windows command paths. Calling `sh` on a Windows runner causes an immediate `NoSuchMethod` or `File Not Found` error. Using native `bat` and `powershell` ensures reliable, cross-compatible execution on Windows hosts.

### Q16: How are sensitive credentials protected in Jenkins?
**Answer:**  
Sensitive credentials (such as Docker Hub passwords and EC2 SSH private keys) are stored in the encrypted **Jenkins Credentials Vault**. Inside the `Jenkinsfile`, the `withCredentials()` binding injects these values dynamically as temporary environment variables that are masked (`****`) in all console build logs, preventing credentials from appearing in build output or source control.

### Q17: What is the significance of the `post` block in a Declarative Pipeline?
**Answer:**  
The `post` block executes cleanup, reporting, and notification logic after stages finish, regardless of build outcome:
- `always`: Archives test results (`junit-backend.xml`) and security scan JSON reports.
- `success`: Sends success alerts or tags release versions.
- `failure`: Sends incident notifications to developers and cleans up workspace artifacts.

### Q18: What is a Declarative Pipeline vs. a Scripted Pipeline in Jenkins?
**Answer:**  
**Declarative Pipeline:** Uses a structured, opinionated syntax enclosed in a `pipeline { ... }` block with predefined sections (`stages`, `steps`, `environment`, `post`). It is easier to read, validates syntax before execution, and is the industry standard.  
**Scripted Pipeline:** Written in Groovy code inside a `node { ... }` block, providing programmatic control and loops, but with higher complexity and less built-in error handling.

### Q19: What is the purpose of the JUnit plugin in Jenkins?
**Answer:**  
The JUnit plugin parses XML test report files (generated by `pytest --junitxml=junit-backend.xml`) and visualizes test trends across builds in the Jenkins UI, displaying pass/fail percentages, individual test durations, and stack traces for failed test cases.

### Q20: How does Jenkins authenticate to our AWS EC2 K3s instance without entering a password?
**Answer:**  
Jenkins uses **Asymmetric Public-Key Cryptography (SSH)**. The private key (`.pem`) is vaulted in Jenkins under credential ID `EC2_SSH_KEY`. The corresponding public key is saved in `/home/ubuntu/.ssh/authorized_keys` on the EC2 instance. During deployment, OpenSSH negotiates cryptographic verification without interactive human prompts.

### Q21: What is a Webhook and how does it trigger a Jenkins build?
**Answer:**  
A webhook is an HTTP POST callback sent by a source code management service (like GitHub) to a remote URL (`http://<jenkins-url>/github-webhook/`) whenever an event (such as `git push` or pull request creation) occurs. Jenkins intercepts this payload and immediately triggers the configured pipeline job.

---

## Section 4: Kubernetes & K3s (10 Questions)

### Q22: What is K3s and why is it well-suited for lightweight or edge deployments?
**Answer:**  
K3s is a lightweight, fully certified Kubernetes distribution developed by Rancher. It packages all Kubernetes components (API server, scheduler, controller-manager, containerd, Flannel CNI, and SQLite/etcd) into a single binary under 100MB, requiring less than 512MB RAM. It is optimized for edge computing, IoT, laboratory environments, and small cloud instances (e.g., AWS EC2 t3.medium).

### Q23: What is a Kubernetes Pod?
**Answer:**  
A Pod is the smallest deployable computing unit in Kubernetes. It encapsulates one or more closely coupled containers that share the same network namespace (IP address and port space), IPC namespace, and storage volumes.

### Q24: What is the difference between a Deployment and a Pod?
**Answer:**  
A **Pod** represents an ephemeral, single container instance. If a standalone Pod crashes or the node dies, it is not recreated.  
A **Deployment** is a higher-level controller that manages the declarative lifecycle of Pods via a ReplicaSet. It handles desired replica counts, self-healing (restarts failed pods), rolling updates, and rollbacks without manual intervention.

### Q25: Explain the difference between `ClusterIP` and `NodePort` Services.
**Answer:**  
- **`ClusterIP`:** The default Kubernetes service type. It assigns an internal virtual IP accessible only from within the cluster. It is used for internal microservice communication (e.g., backend API and database).
- **`NodePort`:** Exposes the service externally on an open port (between 30000–32767) on every cluster node's public/private IP. We use NodePort `30080` to expose the frontend Nginx web server to internet browsers.

### Q26: Why is the PostgreSQL database Service configured with `clusterIP: None` (Headless Service)?
**Answer:**  
Setting `clusterIP: None` creates a **Headless Service**. Instead of load-balancing requests randomly across replicas, Kubernetes returns the direct DNS A-record (IP address) of the specific database pod. Stateful data engines like PostgreSQL require deterministic, single-host connections to prevent write-split-brain conditions.

### Q27: What is the difference between a ConfigMap and a Secret?
**Answer:**  
- **ConfigMap:** Stores non-sensitive configuration data (e.g., environment variables, application versions, hostnames) in plaintext key-value pairs.
- **Secret:** Stores sensitive data (e.g., passwords, private keys, API tokens) base64-encoded. Secrets are mounted into memory (`tmpfs`) within pods rather than written to physical disk, reducing exposure.

### Q28: What is a PersistentVolumeClaim (PVC)?
**Answer:**  
A `PersistentVolumeClaim` is a user's request for persistent storage with specific access modes (e.g., `ReadWriteOnce`) and capacity (e.g., `2Gi`). It abstracts underlying storage mechanisms. In CloudCare, the PostgreSQL pod mounts `postgres-pvc` to `/var/lib/postgresql/data`, ensuring database records persist across pod restarts, updates, and node reboots.

### Q29: What is the difference between a Liveness Probe and a Readiness Probe?
**Answer:**  
- **Liveness Probe:** Checks if the container is still running and healthy. If it fails, Kubernetes kills the container and initiates a restart based on the `restartPolicy`.
- **Readiness Probe:** Checks if the container is ready to accept incoming user network traffic. If it fails, Kubernetes removes the pod's IP from the Service endpoints, preventing requests from hitting an unready or overloaded container.

### Q30: What happens when a container exceeds its memory limit in Kubernetes?
**Answer:**  
Kubernetes enforces memory limits using the Linux kernel's cgroups controller. If a container consumes more RAM than specified in `resources.limits.memory` (e.g., `384Mi`), the kernel terminates the container with an **OOMKilled** (Out Of Memory Killed) error (Exit Code 137). The Deployment controller then spins up a fresh container replica.

### Q31: What is a Kubernetes Namespace and why did we create `cloudcare`?
**Answer:**  
A Namespace provides virtual isolation and multi-tenancy within a single physical Kubernetes cluster. It divides cluster resources, scopes naming conventions (preventing collisions), and allows scoped role-based access control (RBAC) and resource quotas. Creating `namespace: cloudcare` isolates our healthcare microservices from default system components (like `kube-system`).

---

## Section 5: Blue-Green Deployment Strategy (5 Questions)

### Q32: How does the Blue-Green deployment model achieve zero downtime?
**Answer:**  
By running two identical environments concurrently. While version Blue is live and serving 100% of traffic, version Green is deployed and fully tested in isolation. The actual release cutover occurs via an atomic Kubernetes Service selector patch (`version: green`). Because both sets of pods are already initialized, healthy, and warmed up, no connections are dropped, resulting in zero downtime.

### Q33: How does CloudCare execute an instantaneous rollback?
**Answer:**  
If a critical defect is observed on the newly activated environment (e.g., Green), our rollback script (`rollback.ps1`) issues a single Kubernetes API command:
```powershell
kubectl patch service cloudcare-backend-active -n cloudcare --type merge -p '{"spec":{"selector":{"app":"cloudcare-backend","version":"blue"}}}'
```
The Kubernetes endpoints controller updates IP tables in milliseconds, restoring traffic to the Blue pods immediately without needing to re-download or restart containers.

### Q34: What is the main drawback or trade-off of Blue-Green deployment compared to Rolling Updates?
**Answer:**  
**Resource Consumption:** Blue-Green requires double the compute infrastructure (CPU and memory) during the release window because both the active and idle environments run side-by-side. In contrast, Rolling Updates replace pods incrementally, requiring minimal extra headroom.

### Q35: How does Blue-Green deployment handle database schema migrations?
**Answer:**  
Database migrations must follow the **Expand/Contract (Parallel Run) pattern**:
1. **Expand:** The schema is updated with backward-compatible changes (e.g., adding nullable columns) so that both the old version (Blue) and new version (Green) can operate concurrently.
2. **Cutover:** Traffic is switched to Green.
3. **Contract:** Once Green is verified and stable, old deprecated columns or tables are safely removed in a subsequent release.

### Q36: How did we verify that Green was healthy before switching traffic?
**Answer:**  
Our PowerShell deployment script (`switch-traffic.ps1`) queries the Kubernetes API via `kubectl get deployment cloudcare-backend-green -o jsonpath='{.status.readyReplicas}'`. If `readyReplicas` is 0 or null, the script aborts immediately with an error and refuses to patch the service, preventing broken deployments from receiving user traffic.

---

## Section 6: DevSecOps & Security Automation (7 Questions)

### Q37: What does "Shift-Left" mean in DevSecOps?
**Answer:**  
"Shift-Left" refers to moving security practices (such as code analysis, dependency auditing, and compliance checks) earlier into the software development lifecycle (to the "left" on the project timeline). Rather than testing security right before or after deployment, security is embedded directly into developer IDEs and initial CI stages, making vulnerabilities faster and significantly cheaper to resolve.

### Q38: What is Static Application Security Testing (SAST) and what tool was used?
**Answer:**  
SAST analyzes application source code in an idle, non-running state to detect coding errors, insecure function calls, and architectural flaws. We used **Bandit** for Python, which parses the source Abstract Syntax Tree (AST) to identify issues like hardcoded passwords, use of weak cryptographic ciphers, and SQL injection risks.

### Q39: What is Software Composition Analysis (SCA) and which tools did we employ?
**Answer:**  
SCA inspects third-party open-source libraries and transitive dependencies for known Common Vulnerabilities and Exposures (CVEs). We used:
- **`pip-audit`:** Scans Python requirements against the PyPI Advisory Database and Google OSV database.
- **`npm audit`:** Scans JavaScript/Node.js dependencies in the frontend against npm's security advisory registry.

### Q40: What is Trivy and what is its role in our pipeline?
**Answer:**  
**Trivy** (by Aqua Security) is a comprehensive vulnerability scanner for container images, filesystems, and Git repositories. In our CI/CD pipeline, Trivy scans the compiled Docker images for unpatched OS-level packages (Debian/Alpine) and application libraries, outputting discovered CVEs with their severity ratings (LOW, MEDIUM, HIGH, CRITICAL).

### Q41: Explain how the Trivy Security Gate in our `Jenkinsfile` blocks a release.
**Answer:**  
The scan step executes:
```powershell
trivy image --severity CRITICAL --exit-code 1 <image-name>
```
The `--exit-code 1` parameter instructs Trivy to return a process exit code of `1` (indicating failure) if **any** CRITICAL severity vulnerability is detected. In Jenkins, any non-zero exit code immediately marks the stage as failed and halts the pipeline, preventing vulnerable artifacts from being pushed to Docker Hub or deployed to the cluster.

### Q42: What is the difference between a False Positive and a False Negative in security scans?
**Answer:**  
- **False Positive:** The scanner reports a vulnerability that does not actually exist or cannot be exploited in the current context (annoying, causes unnecessary review).
- **False Negative:** The scanner fails to detect an actual, exploitable security flaw (dangerous, exposes production to attacks).

### Q43: What is the difference between Authentication and Authorization?
**Answer:**  
- **Authentication (AuthN):** Verifying the identity of a user or system (e.g., "Are you who you say you are?", verified via passwords, JWT tokens, or SSH keys).
- **Authorization (AuthZ):** Determining what permissions and resources an authenticated user is permitted to access (e.g., "Are you allowed to triage patient records?", enforced via RBAC).

---

## Section 7: Project-Specific Architecture & Troubleshooting (5 Questions)

### Q44: What problem does the CloudCare platform solve?
**Answer:**  
CloudCare coordinates outpatient flow, triage prioritization, physician queues, and real-time appointment scheduling for clinics and hospitals. Its architecture ensures clinical services experience zero downtime during updates and maintain strict data integrity and operational availability.

### Q45: How do the frontend React app and backend FastAPI communicate inside Kubernetes?
**Answer:**  
The frontend container is served by Nginx via NodePort `30080`. When a user performs an action in the browser, the client makes REST HTTP calls to the backend. In Kubernetes, the backend is reachable via the internal ClusterIP service DNS `cloudcare-backend-active:8000` or through the public EC2 IP/DNS configured in the frontend build bundle (`VITE_API_BASE_URL`).

### Q46: If a backend pod shows `CrashLoopBackOff` in Kubernetes, what command-line steps would you take to diagnose it?
**Answer:**  
1. Inspect pod events:
   ```powershell
   kubectl describe pod <pod-name> -n cloudcare
   ```
2. Read the container's standard error logs:
   ```powershell
   kubectl logs <pod-name> -n cloudcare --previous
   ```
3. Check if the database dependency is healthy and reachable:
   ```powershell
   kubectl get pods -l app=cloudcare-postgres -n cloudcare
   ```
4. Verify all referenced Secrets and ConfigMaps exist and have correct keys:
   ```powershell
   kubectl get secret cloudcare-secrets -n cloudcare
   kubectl get configmap cloudcare-config -n cloudcare
   ```

### Q47: Why did we specify CPU and Memory requests and limits in all Kubernetes manifests?
**Answer:**  
- **Requests (`requests.memory`, `requests.cpu`):** The minimum resources guaranteed for the container. The Kubernetes scheduler uses requests to find an appropriate node that has sufficient free capacity.
- **Limits (`limits.memory`, `limits.cpu`):** The maximum resources a container can consume. This prevents "noisy neighbor" scenarios where a single misbehaving container monopolizes node resources, starving critical system processes or other workloads.

### Q48: What is the purpose of CORS and how is it configured in CloudCare?
**Answer:**  
**Cross-Origin Resource Sharing (CORS)** is a browser security mechanism that restricts a web page from making requests to a different domain, protocol, or port than the one that served the page.  
In CloudCare, FastAPI uses `CORSMiddleware` configured with allowed origins from the `CORS_ORIGINS` environment variable (e.g., `http://<EC2-IP>:30080`), permitting the React UI to invoke API endpoints while blocking unauthorized third-party websites from making cross-origin requests.
