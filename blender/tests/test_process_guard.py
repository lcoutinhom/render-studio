import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import unittest


@unittest.skipUnless(sys.platform == 'linux', 'Linux parent-death signal')
class ParentGuardTest(unittest.TestCase):
    def test_child_stops_when_its_worker_disappears(self):
        module = str(Path(__file__).resolve().parents[1])
        child_code = f"import sys,time;sys.path.insert(0,{module!r});from process_guard import terminate_with_parent;terminate_with_parent();print('ready',flush=True);time.sleep(60)"
        parent_code = f"import subprocess,sys,time;p=subprocess.Popen([sys.executable,'-c',{child_code!r}],stdout=subprocess.PIPE,text=True);assert p.stdout.readline().strip()=='ready';print(p.pid,flush=True);time.sleep(60)"
        parent = subprocess.Popen([sys.executable, '-c', parent_code], stdout=subprocess.PIPE, text=True)
        child = None
        try:
            child = int(parent.stdout.readline())
            parent.terminate()
            parent.wait(timeout=5)
            for _ in range(50):
                status = Path(f'/proc/{child}/status')
                if not status.exists() or 'State:\tZ' in status.read_text():
                    break
                time.sleep(.05)
            else:
                self.fail('Render child survived its terminated worker')
        finally:
            if parent.poll() is None:
                parent.kill()
            parent.wait(timeout=5)
            parent.stdout.close()
            if child:
                try:
                    os.kill(child, signal.SIGTERM)
                except ProcessLookupError:
                    pass


if __name__ == '__main__':
    unittest.main()
