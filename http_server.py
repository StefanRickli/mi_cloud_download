"""
This is a simple HTTP server that is designed to work together with a JS script running on the same machine.
On any HTTP GET request, return the number of files in a specified folder.
    If we see a file with extension .crdownload, that is a download in progress which we indicate
    by replying "dip" instead of the number of files.
On an HTTP POST request, interpret it as something to log.
    The path defines the log level (/debug, /info, /warning, /error)
"""


import sys
import time
import datetime
import os.path
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
import socketserver
import logging


########################################################################################
# User changeable variables
########################################################################################

# The path that is monitored for the number of files
im_folder = Path('/path/to/your/downloads')

# The log level for the log file and local console
local_loglevel = logging.DEBUG

# The log level for the JS script in the browser
remote_loglevel = 1


########################################################################################
# Logging setup
########################################################################################

logPath = Path('logs')
logName = Path('{}.log'.format(datetime.datetime.now()))

logFormatter = logging.Formatter("%(asctime)s [%(levelname)-7.7s] %(message)s")
rootLogger = logging.getLogger()
rootLogger.setLevel(local_loglevel)

fileHandler = logging.FileHandler(logPath / logName)
fileHandler.setFormatter(logFormatter)
rootLogger.addHandler(fileHandler)

consoleHandler = logging.StreamHandler(sys.stdout)
consoleHandler.setFormatter(logFormatter)
rootLogger.addHandler(consoleHandler)


########################################################################################
# HTTP server implementation
########################################################################################

class S(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def do_GET(self):
        files = os.listdir(im_folder)
        
        # Check for temporary download file
        if ( len([fn for fn in files if fn.endswith('crdownload')]) ):
            # Return "dip", download in progress
            self._set_headers()
            self.wfile.write('dip'.encode('utf-8'))
        else:
            # Return number of files in monitored folder
            self._set_headers()
            n_files = len([name for name in files if os.path.isfile(im_folder / name)])
            self.wfile.write('{}'.format(n_files).encode('utf-8'))

    def do_HEAD(self):
        self._set_headers()
        
    def do_POST(self):
        self._set_headers()
        content_length = int(self.headers['Content-Length']) # Gets the size of data
        post_data = self.rfile.read(content_length) # Gets the data itself

        # Depending on the POST path, set the log level accordingly
        if (self.path == '/debug'):
            rootLogger.debug(post_data.decode('utf-8'))
            if (remote_loglevel <= 0):
                self.wfile.write('DEBUG:   '.encode('utf-8') + post_data)
            else:
                self.wfile.write('X'.encode('utf-8'))
        if (self.path == '/info'):
            rootLogger.info(post_data.decode('utf-8'))
            if (remote_loglevel <= 1):
                self.wfile.write('INFO:    '.encode('utf-8') + post_data)
            else:
                self.wfile.write('X'.encode('utf-8'))
        if (self.path == '/warning'):
            rootLogger.warning(post_data.decode('utf-8'))
            if (remote_loglevel <= 2):
                self.wfile.write('WARNING: '.encode('utf-8') + post_data)
            else:
                self.wfile.write('X'.encode('utf-8'))
        if (self.path == '/error'):
            rootLogger.error(post_data.decode('utf-8'))
            if (remote_loglevel <= 3):
                self.wfile.write('ERROR:   '.encode('utf-8') + post_data)
            else:
                self.wfile.write('X'.encode('utf-8'))
        
        
########################################################################################
# Start code
########################################################################################

def run(server_class=HTTPServer, handler_class=S, port=50001):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    rootLogger.info('HTTP listening on port {}'.format(port))
    httpd.serve_forever()


if __name__ == '__main__':
    from sys import argv

    if len(argv) == 2:
        run(port=int(argv[1]))
    else:
        run()

