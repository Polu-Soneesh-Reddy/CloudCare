pipeline {
    agent any

    parameters {
        string(name: 'DOCKER_USERNAME', defaultValue: 'YOUR_DOCKERHUB_USERNAME', description: 'Docker Hub username')
        string(name: 'EC2_HOST', defaultValue: 'YOUR_EC2_IP', description: 'EC2 instance IP/hostname')
        string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'EC2 SSH user')
        booleanParam(name: 'SKIP_DEPLOY', defaultValue: false, description: 'Skip K8s deployment')
        booleanParam(name: 'SKIP_SECURITY', defaultValue: false, description: 'Skip security scans (not recommended)')
    }

    environment {
        GIT_COMMIT_SHORT = ""
        BACKEND_IMAGE = "${params.DOCKER_USERNAME}/cloudcare-backend"
        FRONTEND_IMAGE = "${params.DOCKER_USERNAME}/cloudcare-frontend"
        K8S_NAMESPACE = "cloudcare"
        REPORTS_DIR = "security-reports"
    }

    stages {
        stage('Checkout & Version') {
            steps {
                checkout scm
                script {
                    // Extract short git SHA for unique immutable image tagging
                    def sha = bat(script: '@git rev-parse --short HEAD', returnStdout: true).trim()
                    env.GIT_COMMIT_SHORT = sha
                    echo "=========================================================="
                    echo "CloudCare Pipeline - Commit SHA: ${env.GIT_COMMIT_SHORT}"
                    echo "Backend Target Image:  ${env.BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}"
                    echo "Frontend Target Image: ${env.FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}"
                    echo "=========================================================="
                }
            }
        }

        stage('Environment Setup') {
            steps {
                bat '''
                    @echo === Tool Versions ===
                    @git --version
                    @python --version || echo Python not in PATH
                    @node --version || echo Node not in PATH
                    @npm --version || echo NPM not in PATH
                    @docker --version || echo Docker not in PATH
                '''
                powershell '''
                    New-Item -ItemType Directory -Force -Path $env:REPORTS_DIR | Out-Null
                    Write-Host "Created reports directory: $env:REPORTS_DIR"
                '''
            }
        }

        stage('Backend Dependencies') {
            steps {
                bat '''
                    @echo Installing Python dependencies...
                    python -m pip install --upgrade pip
                    python -m pip install -r backend/requirements.txt pytest pytest-cov bandit pip-audit
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                bat '''
                    @echo Running Backend Unit and Integration Tests...
                    python -m pytest backend/tests -v --junitxml=junit-backend.xml --cov=backend/app --cov-report=xml:coverage.xml
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'junit-backend.xml'
                }
            }
        }

        stage('Frontend Dependencies') {
            steps {
                bat '''
                    @echo Installing Frontend NPM packages...
                    cd frontend && npm ci
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    @echo Building Frontend Production Bundle...
                    cd frontend && npm run build
                '''
            }
        }

        stage('Bandit SAST') {
            when {
                expression { return !params.SKIP_SECURITY }
            }
            steps {
                powershell '''
                    Write-Host "Running Bandit Python Static Code Analysis..."
                    if (Get-Command bandit -ErrorAction SilentlyContinue) {
                        bandit -r backend/app -f json -o "$env:REPORTS_DIR\\bandit-report.json" --severity-level medium
                        Write-Host "Bandit SAST scan completed. Report saved to $env:REPORTS_DIR\\bandit-report.json"
                    } else {
                        Write-Host "Warning: Bandit CLI not found. Skipping SAST."
                    }
                    exit 0 # Non-blocking advisory stage
                '''
            }
        }

        stage('pip-audit') {
            when {
                expression { return !params.SKIP_SECURITY }
            }
            steps {
                powershell '''
                    Write-Host "Running pip-audit Dependency Vulnerability Scan..."
                    if (Get-Command pip-audit -ErrorAction SilentlyContinue) {
                        pip-audit -r backend/requirements.txt --format json -o "$env:REPORTS_DIR\\pip-audit-report.json"
                        Write-Host "pip-audit scan completed. Report saved to $env:REPORTS_DIR\\pip-audit-report.json"
                    } else {
                        Write-Host "Warning: pip-audit CLI not found. Skipping dependency audit."
                    }
                    exit 0 # Non-blocking advisory stage
                '''
            }
        }

        stage('npm audit') {
            when {
                expression { return !params.SKIP_SECURITY }
            }
            steps {
                powershell '''
                    Write-Host "Running npm audit for frontend dependencies..."
                    Push-Location frontend
                    npm audit --json | Out-File -FilePath "..\\$env:REPORTS_DIR\\npm-audit-report.json" -Encoding utf8
                    Pop-Location
                    Write-Host "npm audit completed. Report saved to $env:REPORTS_DIR\\npm-audit-report.json"
                    exit 0 # Non-blocking advisory stage
                '''
            }
        }

        stage('Docker Build Backend') {
            steps {
                bat """
                    @echo Building Docker Image for Backend...
                    docker build -t ${env.BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} -t ${env.BACKEND_IMAGE}:demo -t ${env.BACKEND_IMAGE}:latest ./backend
                """
            }
        }

        stage('Docker Build Frontend') {
            steps {
                bat """
                    @echo Building Docker Image for Frontend...
                    docker build --build-arg VITE_API_BASE_URL=http://${params.EC2_HOST}:8000 -t ${env.FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} -t ${env.FRONTEND_IMAGE}:demo -t ${env.FRONTEND_IMAGE}:latest ./frontend
                """
            }
        }

        stage('Trivy Scan Backend') {
            when {
                expression { return !params.SKIP_SECURITY }
            }
            steps {
                powershell """
                    Write-Host "Running Trivy Container Vulnerability Scan on Backend..."
                    if (Get-Command trivy -ErrorAction SilentlyContinue) {
                        trivy image --severity CRITICAL --exit-code 1 --format json --output "$env:REPORTS_DIR\\trivy-backend-report.json" ${env.BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        if (\$LASTEXITCODE -ne 0) {
                            Write-Host "CRITICAL vulnerability detected in Backend image! Security Gate FAILED." -ForegroundColor Red
                            exit 1
                        }
                        Write-Host "Trivy Backend Scan PASSED (Zero CRITICAL vulnerabilities)." -ForegroundColor Green
                    } else {
                        Write-Host "Warning: Trivy CLI not installed. Skipping container scan."
                    }
                """
            }
        }

        stage('Trivy Scan Frontend') {
            when {
                expression { return !params.SKIP_SECURITY }
            }
            steps {
                powershell """
                    Write-Host "Running Trivy Container Vulnerability Scan on Frontend..."
                    if (Get-Command trivy -ErrorAction SilentlyContinue) {
                        trivy image --severity CRITICAL --exit-code 1 --format json --output "$env:REPORTS_DIR\\trivy-frontend-report.json" ${env.FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        if (\$LASTEXITCODE -ne 0) {
                            Write-Host "CRITICAL vulnerability detected in Frontend image! Security Gate FAILED." -ForegroundColor Red
                            exit 1
                        }
                        Write-Host "Trivy Frontend Scan PASSED (Zero CRITICAL vulnerabilities)." -ForegroundColor Green
                    } else {
                        Write-Host "Warning: Trivy CLI not installed. Skipping container scan."
                    }
                """
            }
        }

        stage('Docker Push') {
            when {
                allOf {
                    expression { return !params.SKIP_DEPLOY }
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_HUB_CREDS', usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                    bat '''
                        @echo Authenticating to Docker Hub...
                        @echo %DH_PASS% | docker login -u %DH_USER% --password-stdin
                    '''
                    bat """
                        @echo Pushing Backend Images...
                        docker push ${env.BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        docker push ${env.BACKEND_IMAGE}:demo
                        docker push ${env.BACKEND_IMAGE}:latest

                        @echo Pushing Frontend Images...
                        docker push ${env.FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        docker push ${env.FRONTEND_IMAGE}:demo
                        docker push ${env.FRONTEND_IMAGE}:latest

                        @echo Logging out from Docker Hub...
                        docker logout
                    """
                }
            }
        }

        stage('Deploy to K3s') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'EC2_SSH_KEY', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
                    powershell """
                        Write-Host "Deploying CloudCare manifests to K3s on EC2: ${params.EC2_HOST}"
                        
                        # Copy Kubernetes base manifests to remote EC2
                        scp -i "\$env:SSH_KEY" -o StrictHostKeyChecking=no -r k8s ${params.EC2_USER}@${params.EC2_HOST}:/home/${params.EC2_USER}/cloudcare-k8s
                        
                        # Apply Kubernetes manifests remotely
                        ssh -i "\$env:SSH_KEY" -o StrictHostKeyChecking=no ${params.EC2_USER}@${params.EC2_HOST} @"
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/00-namespace.yaml
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/01-configmap.yaml
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/03-postgres-pvc.yaml
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/04-postgres.yaml
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/05-backend.yaml
                            kubectl apply -f /home/${params.EC2_USER}/cloudcare-k8s/base/06-frontend.yaml
                            
                            # Update deployment image with new SHA tag
                            kubectl set image deployment/cloudcare-backend backend=${env.BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} -n ${env.K8S_NAMESPACE}
                            kubectl set image deployment/cloudcare-frontend frontend=${env.FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} -n ${env.K8S_NAMESPACE}
                            
                            # Await rollout confirmation
                            kubectl rollout status deployment/cloudcare-backend -n ${env.K8S_NAMESPACE} --timeout=180s
                            kubectl rollout status deployment/cloudcare-frontend -n ${env.K8S_NAMESPACE} --timeout=180s
"@
                    """
                }
            }
        }

        stage('Post-Deploy Verify') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                powershell """
                    Write-Host "Verifying live endpoint health at http://${params.EC2_HOST}:8000/health..."
                    Start-Sleep -Seconds 10
                    try {
                        \$response = Invoke-RestMethod -Uri "http://${params.EC2_HOST}:8000/health" -Method Get -TimeoutSec 15
                        Write-Host "Health Check Response: \$(\$response | ConvertTo-Json -Compress)" -ForegroundColor Green
                        if (\$response.status -ne "healthy") {
                            throw "Health check returned unexpected status: \$(\$response.status)"
                        }
                        Write-Host "Post-deployment smoke test successfully verified!" -ForegroundColor Green
                    } catch {
                        Write-Host "Deployment health check verification failed: \$_" -ForegroundColor Red
                        throw \$_
                    }
                """
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'security-reports/*.*, junit-backend.xml, coverage.xml', allowEmptyArchive: true
            echo "Archived test results and security scan reports."
        }
        success {
            echo "=========================================================="
            echo "CloudCare CI/CD Pipeline SUCCEEDED for commit ${env.GIT_COMMIT_SHORT}!"
            echo "=========================================================="
        }
        failure {
            echo "=========================================================="
            echo "CloudCare CI/CD Pipeline FAILED for commit ${env.GIT_COMMIT_SHORT}."
            echo "Check console log and archived reports for failure root cause."
            echo "=========================================================="
        }
    }
}
