// ============================================================
// Hindu Swaraj Party — Jenkinsfile
// Repo   : https://github.com/prasadbhor/myproject.git
// Branch strategy:
//   feature/* → Install → Lint → Test → Docker Build → Smoke Test
//   master     → above  + Docker Push + Deploy
// ============================================================
pipeline {
  agent any

  environment {
    APP_NAME     = 'hindu-swaraj-party'
    DOCKER_IMAGE = "prasadbhor/${APP_NAME}"
    DOCKER_TAG   = "${env.BUILD_NUMBER}"
    APP_DIR      = "hindu-swaraj-party"   // subfolder in repo root
    // Jenkins Credentials needed:
    //   dockerhub-creds  → Username + Password  (Docker Hub login)
    //   admin-token      → Secret Text          (ADMIN_TOKEN value)
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 20, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()
  }

  stages {

    // ── 1. Checkout ──────────────────────────────────────────
    stage('Checkout') {
      steps {
        echo "Branch: ${env.BRANCH_NAME} | Build: #${env.BUILD_NUMBER}"
        checkout scm
      }
    }

    // ── 2. Install ───────────────────────────────────────────
    stage('Install') {
      steps {
        dir("${APP_DIR}") {
          sh 'node --version && npm --version'
          sh 'npm ci --prefer-offline'
        }
      }
    }

    // ── 3. Lint ──────────────────────────────────────────────
    stage('Lint') {
      steps {
        dir("${APP_DIR}") {
          script {
            def pkg = readJSON file: 'package.json'
            if (pkg.scripts?.lint) {
              sh 'npm run lint'
            } else {
              echo 'No lint script — skipping.'
            }
          }
        }
      }
    }

    // ── 4. Test ──────────────────────────────────────────────
    stage('Test') {
      steps {
        dir("${APP_DIR}") {
          script {
            def pkg = readJSON file: 'package.json'
            if (pkg.scripts?.test) {
              sh 'npm test'
            } else {
              echo 'No test script — skipping.'
            }
          }
        }
      }
    }

    // ── 5. Docker Build ───────────────────────────────────────
    stage('Docker Build') {
      steps {
        dir("${APP_DIR}") {
          sh """
            docker build \
              --label "build.number=${env.BUILD_NUMBER}" \
              --label "git.branch=${env.BRANCH_NAME}" \
              --label "git.commit=${env.GIT_COMMIT?.take(7)}" \
              -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
              -t ${DOCKER_IMAGE}:latest \
              .
          """
        }
      }
    }

    // ── 6. Container Smoke Test ───────────────────────────────
    stage('Smoke Test') {
      steps {
        script {
          sh """
            docker run -d --name hsp-smoke-${BUILD_NUMBER} \
              -p 3099:3000 \
              -e NODE_ENV=test \
              ${DOCKER_IMAGE}:${DOCKER_TAG}
          """
          sleep(time: 8, unit: 'SECONDS')
          sh """
            curl -sf http://localhost:3099/health \
              || (docker logs hsp-smoke-${BUILD_NUMBER} && exit 1)
          """
          echo '✅ Health check passed'
        }
      }
      post {
        always {
          sh """
            docker stop hsp-smoke-${BUILD_NUMBER} || true
            docker rm   hsp-smoke-${BUILD_NUMBER} || true
          """
        }
      }
    }

    // ── 7. Docker Push (master only) ─────────────────────────
    stage('Docker Push') {
      when { branch 'master' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-creds',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh """
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
            docker push ${DOCKER_IMAGE}:latest
            docker logout
          """
        }
      }
    }

    // ── 8. Deploy (master only) ───────────────────────────────
    stage('Deploy') {
      when { branch 'master' }
      steps {
        withCredentials([string(credentialsId: 'admin-token', variable: 'ADMIN_TOKEN')]) {
          sh """
            docker stop ${APP_NAME} || true
            docker rm   ${APP_NAME} || true
            docker run -d \
              --name ${APP_NAME} \
              --restart unless-stopped \
              -p 3000:3000 \
              -v \$(pwd)/${APP_DIR}/data:/app/data \
              -e NODE_ENV=production \
              -e PORT=3000 \
              -e ADMIN_TOKEN=\$ADMIN_TOKEN \
              ${DOCKER_IMAGE}:${DOCKER_TAG}
          """
          echo "🚀 Deployed ${APP_NAME}:${DOCKER_TAG}"
        }
      }
    }

  } // end stages

  post {
    success {
      echo "✅ SUCCESS — ${env.BRANCH_NAME} #${env.BUILD_NUMBER}"
    }
    failure {
      echo "❌ FAILED  — ${env.BRANCH_NAME} #${env.BUILD_NUMBER}"
      // mail to: 'prasadbhor0767@gmail.com',
      //      subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
      //      body: "Console: ${env.BUILD_URL}"
    }
    always {
      sh "docker rmi ${DOCKER_IMAGE}:${DOCKER_TAG} || true"
      cleanWs()
    }
  }
}
