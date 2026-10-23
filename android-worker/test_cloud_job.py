"""Cloud job lifecycle contract tests. Google SDK clients are mocked locally."""
import io
import sys
import types
import tempfile
import unittest
from pathlib import Path

if 'google.cloud' not in sys.modules:
    google=types.ModuleType('google')
    cloud=types.ModuleType('google.cloud')
    cloud.firestore=types.SimpleNamespace()
    cloud.storage=types.SimpleNamespace()
    google.cloud=cloud
    sys.modules['google']=google
    sys.modules['google.cloud']=cloud
import cloud_job


class FakeDoc:
    def __init__(self): self.data={'state':'queued','expiryMs':9999999999999};self.calls=[]
    def get(self): return types.SimpleNamespace(exists=True,to_dict=lambda:self.data)
    def update(self,d): self.data.update(d);self.calls.append(dict(d))
class FakeBlob:
    def __init__(self,name): self.name=name;self.uploaded=None;self.deleted=False
    def download_as_bytes(self):
        return b'{"url":"https://example.org","appName":"Example","packageName":"com.example.app","splashColor":"#D8E6B5","iconPngBase64":"fake"}'
    def upload_from_filename(self,path,content_type=None):
        self.uploaded=Path(path).read_bytes();self.type=content_type
    def delete(self): self.deleted=True
class FakeBucket:
    def __init__(self):self.blobs={}
    def blob(self,name):return self.blobs.setdefault(name,FakeBlob(name))
class FakeDb:
    def __init__(self):self.document=FakeDoc()
    def collection(self,name):return types.SimpleNamespace(document=lambda job_id:self.document)

class TestCloudJob(unittest.TestCase):
    def test_compiled_artifacts_uploaded_and_status_persisted(self):
        store=FakeBucket();db=FakeDb()
        def generate(spec,path):
            self.assertEqual(spec['appName'],'Example')
            dist=Path(path)/'dist';dist.mkdir()
            for name in cloud_job.ALLOWED_NAMES:(dist/name).write_bytes(b'X'*2048)
        cloud_job.execute('a'*32,store,db,runner=generate)
        self.assertEqual(db.document.data['state'],'ready')
        for name in cloud_job.ALLOWED_NAMES:
            self.assertGreater(len(store.blob('builds/'+'a'*32+'/'+name).uploaded),1024)
        self.assertTrue(store.blob('builds/'+'a'*32+'/input.json').deleted)
    def test_failed_build_marks_job_and_removes_spec(self):
        bucket=FakeBucket();db=FakeDb()
        with self.assertRaises(RuntimeError):
            cloud_job.execute('a'*32,bucket,db,runner=lambda spec,path:(_ for _ in ()).throw(RuntimeError('failed')))
        self.assertEqual(db.document.data['state'],'failed')
        self.assertTrue(bucket.blob('builds/'+'a'*32+'/input.json').deleted)

if __name__=='__main__':unittest.main()
