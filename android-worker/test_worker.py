import base64
from pathlib import Path
import tempfile
import unittest
import zlib
import struct
from build import valid_spec, prepare_project

def example_png():
    def chunk(tag, payload):
        return struct.pack('>I',len(payload))+tag+payload+struct.pack('>I',zlib.crc32(tag+payload)&0xffffffff)
    head=chunk(b'IHDR',struct.pack('>IIBBBBB',512,512,8,6,0,0,0))
    raw=b''.join(b'\x00'+b'\x20\x80\x20\xff'*512 for _ in range(512))
    img=b'\x89PNG\r\n\x1a\n'+head+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
    return base64.b64encode(img).decode()

class TestWorker(unittest.TestCase):
    def test_input_validation(self):
        data={'url':'https://example.org','appName':'My Site','iconPngBase64':example_png(),'splashColor':'#ACCF99'}
        self.assertEqual(valid_spec(data)['splashColor'],'#ACCF99')
        with self.assertRaises(ValueError): valid_spec({**data,'url':'http://example.org'})
        with self.assertRaises(ValueError): valid_spec({**data,'iconPngBase64':''})
        with self.assertRaises(ValueError): valid_spec({**data,'splashColor':'red'})
    def test_creates_android_project_and_references(self):
        data={'url':'https://example.org/page','appName':'Demo App','iconPngBase64':example_png(),'splashColor':'#ACCF99','orderId':'test'}
        with tempfile.TemporaryDirectory() as tmp:
            root,meta=prepare_project(data,tmp)
            self.assertEqual(meta['targetSdk'],36)
            java=(root/'app/src/main/java/ai/appweld/wrapper/MainActivity.java').read_text()
            self.assertIn('https://example.org/page',java)
            self.assertIn('MIXED_CONTENT_NEVER_ALLOW',java)
            self.assertIn('handler.cancel()',java)
            self.assertTrue((root/'app/src/main/res/mipmap-nodpi/ic_launcher.png').exists())
            self.assertIn('targetSdk 36',(root/'app/build.gradle').read_text())

if __name__=='__main__':unittest.main()
