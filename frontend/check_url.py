import urllib.request
import re

url = 'https://fix-buddy-project.vercel.app'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    js_files = re.findall(r'src=\"(.*?\.js)\"', html)
    print('Found JS files:', js_files)
    for js in js_files:
        js_url = url + js
        print('Fetching', js_url)
        js_req = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
        js_content = urllib.request.urlopen(js_req).read().decode('utf-8')
        if 'localhost:8000' in js_content:
            print('!!! LOCALHOST:8000 FOUND in', js)
        if 'onrender.com' in js_content:
            print('!!! ONRENDER.COM FOUND in', js)
            matches = re.findall(r'https?://[^\s\"\']*onrender\.com[^\s\"\']*', js_content)
            print('Matches:', set(matches))
except Exception as e:
    print('Error:', e)
