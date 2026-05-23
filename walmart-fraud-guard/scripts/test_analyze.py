import urllib.request, json, sys
base='http://localhost:8000'
# login
login_data=json.dumps({'username':'analyst1','password':'analyst_password'}).encode()
req=urllib.request.Request(base+'/api/v1/auth/login', data=login_data, headers={'Content-Type':'application/json'})
try:
    resp=urllib.request.urlopen(req)
    token=json.loads(resp.read().decode())['access_token']
    print('Got token')
except Exception as e:
    print('Login failed', e)
    sys.exit(1)
# post analyze
body={
  'id':'test-high-risk-1',
  'user_id':'user-new-123',
  'merchant_id':'m-999',
  'amount':5000.00,
  'currency':'USD',
  'account_age_days':3,
  'total_orders':2,
  'total_returns':2,
  'avg_order_value':2500,
  'avg_return_value':2450
}
req=urllib.request.Request(base+'/api/v1/transactions/analyze', data=json.dumps(body).encode(), headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
try:
    resp=urllib.request.urlopen(req)
    print('Status', resp.getcode())
    print(resp.read().decode())
except Exception as e:
    try:
        err=e.read().decode()
    except Exception:
        err=str(e)
    print('Request failed:', err)
