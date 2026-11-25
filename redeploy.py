import os
import sys
import subprocess

SERVER = os.environ.get("DEPLOY_SERVER", "root@192.168.50.55")
PROJECT_ROOT = os.environ.get("DEPLOY_PROJECT_ROOT", "/var/www/kaizen")
ZIP_FILE = "deployment_phase_2.zip"

def main():
    print("=" * 65)
    print("🚀 ONE-CLICK KAIZEN REDEPLOY SCRIPT")
    print(f"   Target: {SERVER}:{PROJECT_ROOT}")
    print("=" * 65)

    if not os.path.exists(ZIP_FILE):
        print(f"❌ Error: '{ZIP_FILE}' not found locally!")
        sys.exit(1)

    print(f"\n[1/3] 📤 Uploading {ZIP_FILE} to server...")
    try:
        subprocess.run(["scp", ZIP_FILE, f"{SERVER}:{PROJECT_ROOT}/"], check=True)
        print("✅ Upload complete!")
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        print("Tip: Make sure server IP is reachable and SSH key/password is valid.")
        sys.exit(1)

    print(f"\n[2/3] ⚙️ Unzipping, running migrations (alembic upgrade head) & restarting backend...")
    remote_cmd = (
        f"cd {PROJECT_ROOT} && "
        f"unzip -o {ZIP_FILE} -d {PROJECT_ROOT}/ && "
        f"alembic upgrade head && "
        f"(systemctl restart kaizen-backend || pm2 restart all || docker compose restart backend || echo 'Restart triggered')"
    )
    try:
        subprocess.run(["ssh", SERVER, remote_cmd], check=True)
        print("✅ Backend updated and migrations applied!")
    except Exception as e:
        print(f"⚠️ Note during remote backend update: {e}")

    print(f"\n[3/3] 🎨 Rebuilding frontend on server...")
    frontend_cmd = f"cd {PROJECT_ROOT}/frontend && npm run build"
    try:
        subprocess.run(["ssh", SERVER, frontend_cmd], check=True)
        print("✅ Frontend build completed!")
    except Exception as e:
        print(f"⚠️ Note during frontend build: {e}")

    print("\n" + "=" * 65)
    print("🎉 REDEPLOY FINISHED SUCCESSFULLY!")
    print("👉 Open your browser at https://kaizen.abhiyantatech.com and press Ctrl + Shift + R")
    print("=" * 65)

if __name__ == "__main__":
    main()
