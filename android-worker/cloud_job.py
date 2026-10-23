#!/usr/bin/env python3
"""Single isolated Cloud Run Job task for an Appweld-owned, validated input.
Never prints the icon, signing-key password, or source spec. One attempt per job.
"""
import json
import os
import tempfile
from pathlib import Path
from google.cloud import firestore, storage
from build import build

ALLOWED_NAMES = ('android-app.apk', 'android-app.aab', 'signing-key-backup.zip')


def execute(job_id, bucket, db, runner=build):
    if len(job_id) != 32 or any(c not in '0123456789abcdef' for c in job_id):
        raise ValueError('Invalid job identifier')
    ref = db.collection('appweld_jobs').document(job_id)
    snapshot = ref.get()
    if not snapshot.exists or snapshot.to_dict().get('state') != 'queued':
        raise RuntimeError('Build not queued; refusing duplicate/expired execution')
    if int(snapshot.to_dict().get('expiryMs', 0)) <= int(__import__('time').time() * 1000):
        raise RuntimeError('Build request expired')
    ref.update({'state':'building','stage':'Compiling and signing Android release'})
    try:
        with tempfile.TemporaryDirectory(prefix='appweld-') as workspace:
            spec_bytes = bucket.blob(f'builds/{job_id}/input.json').download_as_bytes()
            if len(spec_bytes) > 3 * 1024 * 1024:
                raise ValueError('Build input too large')
            spec = json.loads(spec_bytes)
            # Worker still independently validates all inputs and PNG structure.
            runner(spec, workspace)
            dist = Path(workspace)/'dist'
            for file_name in ALLOWED_NAMES:
                source = dist/file_name
                if not source.is_file() or source.stat().st_size < 1024:
                    raise RuntimeError('Expected output missing: ' + file_name)
                bucket.blob(f'builds/{job_id}/{file_name}').upload_from_filename(str(source),content_type={
                    'android-app.apk':'application/vnd.android.package-archive',
                    'android-app.aab':'application/octet-stream',
                    'signing-key-backup.zip':'application/zip'}[file_name])
        ref.update({'state':'ready','stage':'Android artifacts ready','error':None})
    except Exception:
        ref.update({'state':'failed','stage':'Build failed','error':'Android build failed. Contact support with the build ID.'})
        raise
    finally:
        try:
            bucket.blob(f'builds/{job_id}/input.json').delete()
        except Exception:
            pass  # TTL policy cleans up orphaned spec if delete fails


if __name__ == '__main__':
    identifier=os.environ['APPWELD_BUILD_ID']
    storage_bucket=os.environ['APPWELD_PRIVATE_BUCKET']
    client=storage.Client()
    execute(identifier,client.bucket(storage_bucket),firestore.Client())
