import urllib.request, urllib.error, json

req = urllib.request.Request(
    'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAaV59AdAZOXi1Q7KoDn2BhdsFIz_TrLYY',
    data=json.dumps({'returnSecureToken': True}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
