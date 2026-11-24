import urllib.request, json

base = 'http://localhost:8001'

def get(path, headers={}):
    req = urllib.request.Request(f'{base}{path}', headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def post(path, data, headers={}):
    body = json.dumps(data).encode()
    h = {'Content-Type': 'application/json', **headers}
    req = urllib.request.Request(f'{base}{path}', data=body, headers=h)
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

print('=== 1. Health ===')
print(get('/api/health')['status'])

print('=== 2. Stations ===')
stations = get('/api/stations')
for s in stations:
    print(f"  {s['id']}: {s['name']}")

print('=== 3. Admin login ===')
admin_res = post('/api/auth/login', {'username': 'admin', 'password': 'demo123'})
print(f"  ok={admin_res['ok']} role={admin_res['user']['role']} name={admin_res['user']['name']}")

admin_h = {'X-User-Role': 'admin', 'X-User-Station': '', 'X-User-Id': 'MGR01'}

print('=== 4. Admin hierarchy ===')
hier = get('/api/admin/hierarchy', admin_h)
for h in hier:
    sup = h['supervisor']
    print(f"  Station {sup['stationId']}: {sup['name']} (@{sup['username']}) -> {len(h['workers'])} workers")

print('=== 5. All supervisor logins ===')
for u in ['supervisor.a', 'supervisor.b', 'supervisor.c', 'supervisor.d']:
    r = post('/api/auth/login', {'username': u, 'password': 'demo123'})
    print(f"  {u}: ok={r['ok']} stationId={r['user']['stationId']} role={r['user']['role']}")

print('=== 6. Workers list ===')
sup_h = {'X-User-Role': 'supervisor', 'X-User-Station': 'A', 'X-User-Id': 'SUP_A'}
workers = get('/api/workers', sup_h)
print(f'  count: {len(workers)}')

print('=== 7. Work orders ===')
wos = get('/api/workorders', admin_h)
print(f'  count: {len(wos)}')

print('=== 8. Notices ===')
notices = get('/api/notices', admin_h)
print(f'  count: {len(notices)}')

print('=== 9. Machines ===')
machines = get('/api/machines', admin_h)
print(f'  count: {len(machines)}')

print('ALL CHECKS DONE')
