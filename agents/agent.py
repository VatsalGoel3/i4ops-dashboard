from flask import Flask, jsonify
import psutil, platform, subprocess, time, socket, traceback
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def is_ssh_open():
    try:
        sock = socket.create_connection(("127.0.0.1", 22), timeout=1)
        sock.close()
        return True
    except:
        return False

@app.route('/status')
def status():
    try:
        # Host info
        os_name = platform.platform()
        uptime = int(time.time() - psutil.boot_time())
        cpu_usage = psutil.cpu_percent(interval=1)
        ram_usage = psutil.virtual_memory().percent
        disk_usage = psutil.disk_usage('/').percent

        # VMs via virsh
        vms = []
        try:
            vm_names = subprocess.check_output(['virsh', 'list', '--name', '--all'], text=True).split()
        except Exception:
            vm_names = []

        for name in vm_names:
            if not name: continue
            try:
                state = subprocess.check_output(['virsh', 'domstate', name], text=True).strip()
                xml = subprocess.check_output(['virsh', 'dumpxml', name], text=True)
            except Exception:
                state, xml = "unknown", ""

            vms.append({
                "name": name,
                "status": state,
                "cpu": 0,
                "ram": 0,
                "disk": 0,
                "os": "Unknown",
                "uptime": 0,
                "network": {"ip": "", "mac": ""},
                "xml": xml
            })

        return jsonify({
            "os": os_name,
            "uptime": uptime,
            "ssh": is_ssh_open(),
            "cpu": cpu_usage,
            "ram": ram_usage,
            "disk": disk_usage,
            "vms": vms
        })

    except Exception as e:
        print("[agent] Exception:", e)
        traceback.print_exc()
        return jsonify({"error": traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)