# mi_cloud_download
Reliably downloads all files in an album on Xiaomi cloud. Might produce duplicates (about 1% of downloads) which can easily be deleted manually.

See my [blog entry](http://blogs.ethz.ch/ricklis/?p=445) for full details.

This application was developed in a clean install of Ubuntu 18.04 LTS.

Runtime requirements:
- Python 3
- Chrome with installed Tampermonkey extension and disabled web security (--disable-web-security) to allow Cross-Origin-Requests.

Quick start:
- Edit ´http_server.py´, update path to monitored folder
- Execute ´http_server.py´
- Open Chrome, add a script in Tampermonkey, copy-paste content of ´download_mi_cloud_media.js´
- Browse to Xiaomi Cloud, got to gallyer, open album, open the viewer of a picture. ´download_mi_cloud_media.js´ will start downloading all media
- Leave the picture/video viewer by hitting ESC to pause the script
