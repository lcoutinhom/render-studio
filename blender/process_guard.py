"""Keep a Blender render from surviving a vanished local worker on Linux."""
import ctypes
import os
import signal
import sys


def terminate_with_parent():
    if sys.platform != 'linux':
        return False
    parent = os.getppid()
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(1, signal.SIGTERM, 0, 0, 0) != 0:  # PR_SET_PDEATHSIG
        raise OSError(ctypes.get_errno(), 'Could not protect Blender worker lifetime')
    if os.getppid() != parent:
        os.kill(os.getpid(), signal.SIGTERM)
    return True
