#!/usr/bin/env bash
# Operator-initiated deployment, paid Google Cloud resources may incur charges.
# Run from Appweldai repository root: PROJECT_ID=my-gcp-project bash scripts/deploy-cloud.sh
set -Eeuo pipefail
: "${PROJECT_ID:?Set PROJECT_ID to your existing Google Cloud project ID}"
REGION=asia-south1
BUCKET="${APPWELD_PRIVATE_BUCKET:-${PROJECT_ID}-appweld-private}"
API_SA="appweld-api-sa@${PROJECT_ID}.iam.gserviceaccount.com"
JOB_SA="appweld-build-sa@${PROJECT_ID}.iam.gserviceaccount.com"
for tool in gcloud firebase; do command -v "$tool" >/dev/null || { echo "$tool CLI must be installed and authenticated";exit 1;}; done
echo "Project: $PROJECT_ID | Region: $REGION | Private bucket: $BUCKET"
echo "This creates BILLABLE Cloud Run, Cloud Build, Storage, and Firestore resources."
read -r -p "Type DEPLOY to continue: " ACCEPT
[[ "$ACCEPT" == DEPLOY ]] || exit 1
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com storage.googleapis.com iam.googleapis.com
gcloud artifacts repositories describe appweld --location "$REGION" >/dev/null 2>&1 || gcloud artifacts repositories create appweld --repository-format=docker --location "$REGION"
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 || gcloud firestore databases create --database='(default)' --location="$REGION" --type=firestore-native
gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 || gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access
for name in appweld-api-sa appweld-build-sa; do
  gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 || gcloud iam service-accounts create "$name"
done
for sa in "$API_SA" "$JOB_SA";do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$sa" --role=roles/datastore.user --quiet >/dev/null
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$sa" --role=roles/storage.objectAdmin --quiet >/dev/null
done
gcloud builds submit --config=cloudbuild.appweld.yaml --substitutions="_REGION=$REGION" .
# Cloud Build substitutes SHORT_SHA only for git-connected builds. Manually submitted builds
# may use an empty SHORT_SHA, so resolve the image by a stable tag instead in this script.
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/appweld/appweld-api:latest"
WORKER_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/appweld/appweld-worker:latest"
gcloud run jobs deploy appweld-build-job --project "$PROJECT_ID" --region "$REGION" --image "$WORKER_IMAGE" --service-account "$JOB_SA" --set-env-vars="APPWELD_PRIVATE_BUCKET=$BUCKET" --tasks=1 --max-retries=0 --task-timeout=1200s --memory=3Gi --cpu=2
gcloud run jobs add-iam-policy-binding appweld-build-job --region "$REGION" --member="serviceAccount:$API_SA" --role=roles/run.jobsExecutorWithOverrides
gcloud run deploy appweld-api --project "$PROJECT_ID" --region "$REGION" --image "$API_IMAGE" --service-account "$API_SA" --allow-unauthenticated --max-instances=1 --concurrency=8 --memory=512Mi --cpu=1 --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,APPWELD_REGION=$REGION,APPWELD_RUN_JOB=appweld-build-job,APPWELD_PRIVATE_BUCKET=$BUCKET,APPWELD_BUILDS_ENABLED=true,APPWELD_FREE_TEST_DOWNLOADS=true,APPWELD_DAILY_BUILD_LIMIT=2,APPWELD_DOMAIN_DAILY_LIMIT=1"
echo "Cloud API deployed. Check its /healthz and /api/capabilities endpoints."
echo "Firebase Hosting rewrite is in firebase.json: /api/** -> appweld-api ($REGION)"
echo "Deploy static site after checking API: firebase deploy --project $PROJECT_ID --only hosting"
