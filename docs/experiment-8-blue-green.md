# Experiment 8: Blue-Green Zero-Downtime Deployment & Automated Rollback

## 1. Experiment Overview
- **Title:** Implementing Blue-Green Deployment Strategy on Kubernetes (K3s) for Zero-Downtime Healthcare Operations.
- **Objective:** Deploy two identical production environments (Blue and Green), demonstrate traffic routing via Kubernetes Service label selectors, perform an atomic zero-downtime release to Green, verify active version responses, and execute an instantaneous rollback to Blue in the event of an operational anomaly.
- **Tools Used:** Kubernetes (K3s), PowerShell, kubectl, AWS EC2, FastAPI.

---

## 2. Theory & Operational Rationale

### What is Blue-Green Deployment?
Blue-Green deployment is a release management strategy where two identical production environments—termed **Blue** and **Green**—are maintained simultaneously.
- At any point in time, only one environment (e.g., Blue) is live and serving all active production traffic.
- The new release (e.g., Green) is deployed to the idle environment without affecting live users.
- Full automated testing, synthetic transactions, and health checks are conducted against the Green environment in production-identical conditions.
- Once verified, traffic is redirected atomically from Blue to Green by modifying the router / Kubernetes Service selector.
- The old version (Blue) remains standing as a warm standby for instant rollback if any regression is detected.

### Why Blue-Green Deployment Matters for Healthcare
In mission-critical clinical operations (e.g., emergency triage, inpatient medication dispensing, operating theatre scheduling), an outage or cold reboot of services is intolerable:
- **Zero Downtime:** Patients and hospital staff experience zero interruption.
- **Instant Rollback:** If a defect slips into the new version, rolling back takes milliseconds (repointing a label selector), eliminating lengthy redeployment delays.
- **Production Pre-Warming:** Database connections, caches, and JIT compilation can be warmed up in the idle environment before handling actual patient requests.

---

## 3. CloudCare Blue-Green Architectural Topology

In CloudCare, Kubernetes native primitives manage the traffic switch:

```
[Inbound Traffic: Frontend / REST Clients]
                     │
                     ▼
       ┌───────────────────────────┐
       │   K8s Service:            │
       │ cloudcare-backend-active  │
       │   Port: 8000              │
       │ Selector: version = blue  │ ◄────── Modified to "green" during release!
       └─────────────┬─────────────┘
                     │
         ┌───────────┴───────────┐
         │ (Active Route)        │ (Idle / Test Route)
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Deployment: Blue │    │ Deployment: Green│
│ Pods: 1          │    │ Pods: 1          │
│ Image: v1        │    │ Image: v2        │
│ Label:           │    │ Label:           │
│  version=blue    │    │  version=green   │
└──────────────────┘    └──────────────────┘
```

Both deployments connect to the same shared PostgreSQL database instance (`cloudcare-postgres`), ensuring data consistency across releases.

---

## 4. Step-by-Step Demonstration Walkthrough

Follow these steps directly to execute the demonstration during lab evaluation.

### Step 4.1: Initial Setup & Applying Manifests
Ensure the CloudCare namespace, database, and blue-green manifests are created:

```powershell
# Navigate to project root
cd C:\Users\sonee\.gemini\antigravity\scratch\cloudcare

# Apply blue-green deployments and the active routing service
kubectl apply -f k8s/blue-green/blue-deployment.yaml
kubectl apply -f k8s/blue-green/green-deployment.yaml
kubectl apply -f k8s/blue-green/service-active.yaml
```

---

### Step 4.2: Deploy Blue (v1)
Run the automated blue deployment script:

```powershell
.\scripts\deploy-blue.ps1 -ImageTag v1
```

**Expected Output:**
```
[CloudCare] Deploying BLUE version with tag: v1
deployment.apps/cloudcare-backend-blue image updated
[CloudCare] Waiting for BLUE rollout to complete...
Waiting for deployment "cloudcare-backend-blue" rollout to finish: 1 of 1 updated replicas are available...
deployment "cloudcare-backend-blue" successfully rolled out
[CloudCare] BLUE deployment ready.
Run .\scripts\switch-traffic.ps1 -Target blue to direct traffic to BLUE
```

---

### Step 4.3: Direct Live Traffic to Blue & Verify Version
Ensure the active service selector points to `blue`:

```powershell
.\scripts\switch-traffic.ps1 -Target blue
.\scripts\verify-version.ps1
```

**Expected Output:**
```
=== CloudCare Deployment Status ===
Active Service Selector: blue

--- Pod Status ---
NAME                                      READY   STATUS    RESTARTS   AGE   LABELS
cloudcare-backend-blue-7489dfb65-m9k12    1/1     Running   0          45s   app=cloudcare-backend,release=v1,version=blue
cloudcare-backend-green-59b867c4b-q8z34   1/1     Running   0          40s   app=cloudcare-backend,release=v2,version=green

--- Deployment Status ---
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
cloudcare-backend-blue    1/1     1            1           50s
cloudcare-backend-green   1/1     1            1           45s

[Done]
```

Test the live endpoint:
```powershell
curl http://<EC2-IP>:8000/health
```
**JSON Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0-blue",
  "environment": "production"
}
```

---

### Step 4.4: Deploy Green (v2)
Now deploy the new release `v2` to the green environment:

```powershell
.\scripts\deploy-green.ps1 -ImageTag v2
```

**Expected Output:**
```
[CloudCare] Deploying GREEN version with tag: v2
deployment.apps/cloudcare-backend-green image updated
[CloudCare] Waiting for GREEN rollout to complete...
Waiting for deployment "cloudcare-backend-green" rollout to finish: 1 of 1 updated replicas are available...
deployment "cloudcare-backend-green" successfully rolled out
[CloudCare] GREEN deployment ready.
Run .\scripts\switch-traffic.ps1 -Target green to direct traffic to GREEN
```

---

### Step 4.5: Perform Pre-Traffic Health Checks on Green
Verify Green pods are healthy before routing any clinical traffic:

```powershell
# Port forward green pod directly to a local test port (8001) for verification
kubectl port-forward deployment/cloudcare-backend-green 8001:8000 -n cloudcare
```
*In another terminal:*
```powershell
curl http://localhost:8001/health
```
**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0-green"
}
```

---

### Step 4.6: Switch Traffic to Green (Atomic Cutover)
Run the traffic switch script:

```powershell
.\scripts\switch-traffic.ps1 -Target green
```

**Expected Output:**
```
[CloudCare] Switching traffic to: green
service/cloudcare-backend-active patched
[CloudCare] Traffic switched to green successfully.
Verify with: kubectl get endpoints cloudcare-backend-active -n cloudcare
```

---

### Step 4.7: Verify Green is Live
Query the main active service endpoint:

```powershell
.\scripts\verify-version.ps1
curl http://<EC2-IP>:8000/health
```

**Expected Output:**
```
Active Service Selector: green
```
**JSON Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0-green",
  "environment": "production"
}
```
*Notice that the response immediately reflects version `2.0.0-green` with zero dropped packets or TCP timeouts.*

---

### Step 4.8: Execute Emergency Rollback to Blue
Simulate an incident (e.g., an unhandled exception detected in v2) and trigger instant rollback:

```powershell
.\scripts\rollback.ps1
```

**Expected Output:**
```
[CloudCare] Current active: green → Rolling back to: blue
service/cloudcare-backend-active patched
[CloudCare] Rollback complete. Now serving: blue
```

---

### Step 4.9: Verify Rollback Confirmation
```powershell
curl http://<EC2-IP>:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0-blue",
  "environment": "production"
}
```
The system is safely restored to the verified `blue` release in under **250 milliseconds**.

---

## 5. What to Show Faculty (Viva Evaluation Checklist)

1. **Manifest Architecture:**
   - Open `k8s/blue-green/blue-deployment.yaml` and `green-deployment.yaml`.
   - Show the labels: `app: cloudcare-backend`, `version: blue` vs `version: green`.
   - Open `k8s/blue-green/service-active.yaml` and explain how `spec.selector` controls routing.
2. **Pre-flight Validation in Script:**
   - Open `scripts/switch-traffic.ps1`.
   - Show line 16:
     ```powershell
     $ready = kubectl get deployment "cloudcare-backend-$Target" -o jsonpath='{.status.readyReplicas}'
     ```
     Explain that the script **refuses** to switch traffic if the target deployment is crashing or not completely ready.
3. **Live Demonstration:**
   - Run `.\scripts\switch-traffic.ps1 -Target green` and query `/health`.
   - Run `.\scripts\rollback.ps1` and query `/health` again to show the version reverting instantly.
4. **Zero-Downtime Proof:**
   - Execute a continuous PowerShell ping loop while switching:
     ```powershell
     while($true) { (Invoke-RestMethod http://<EC2-IP>:8000/health).version; Start-Sleep -Milliseconds 100 }
     ```
   - Trigger the traffic switch in another shell. Show that all HTTP requests succeed with 200 OK during the switchover.
