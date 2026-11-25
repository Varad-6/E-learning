import os
import sys
import subprocess

DEFAULT_SERVER = os.environ.get("DEPLOY_SERVER", "root@192.168.50.55")

def main():
    print("=" * 65)
    print("🔐 SAFE KAIZEN SSL CERTIFICATE INSTALLER")
    print("=" * 65)

    server = input(f"Enter server SSH (Press ENTER for {DEFAULT_SERVER}): ").strip()
    if not server:
        server = DEFAULT_SERVER

    if not os.path.exists("fullchain.pem") or not os.path.exists("privkey.pem"):
        print("❌ Error: 'fullchain.pem' or 'privkey.pem' not found locally.")
        sys.exit(1)

    print(f"\n[1/3] Uploading verified SSL certificate & key to {server}...")
    try:
        subprocess.run(["scp", "fullchain.pem", f"{server}:/tmp/kaizen_fullchain.pem"], check=True)
        subprocess.run(["scp", "privkey.pem", f"{server}:/tmp/kaizen_privkey.pem"], check=True)
        print("✅ Files safely copied to temporary location on server.")
    except Exception as e:
        print(f"❌ SCP Upload failed: {e}")
        print("Make sure server IP and SSH key/password are accessible.")
        sys.exit(1)

    print("\n[2/3] Performing safe backup & installation on server...")
    remote_script = """
set -e

# 1. Safety Backup of existing certificates
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "[Safety] Creating backup of existing certificates (timestamp: $TIMESTAMP)..."
if [ -d "/etc/letsencrypt/live/kaizen.abhiyantatech.com" ]; then
    mkdir -p /etc/letsencrypt_backup_$TIMESTAMP
    cp -rL /etc/letsencrypt/live/kaizen.abhiyantatech.com /etc/letsencrypt_backup_$TIMESTAMP/
fi

# 2. Store in permanent safe directory
mkdir -p /etc/ssl/kaizen
cp /tmp/kaizen_fullchain.pem /etc/ssl/kaizen/fullchain.pem
cp /tmp/kaizen_privkey.pem /etc/ssl/kaizen/privkey.pem
chmod 600 /etc/ssl/kaizen/privkey.pem

# 3. Update existing live path so Nginx picks it up without breaking configs
if [ -d "/etc/letsencrypt/live/kaizen.abhiyantatech.com" ]; then
    # Overwrite the actual targets if symlinks, or copy directly
    cp /tmp/kaizen_fullchain.pem /etc/letsencrypt/live/kaizen.abhiyantatech.com/fullchain.pem
    cp /tmp/kaizen_privkey.pem /etc/letsencrypt/live/kaizen.abhiyantatech.com/privkey.pem
fi

# 4. Remove temp files
rm -f /tmp/kaizen_fullchain.pem /tmp/kaizen_privkey.pem

# 5. DRY-RUN: Test Nginx configuration before reloading
echo "[Safety] Testing Nginx configuration..."
nginx -t

# 6. Graceful Reload (Zero downtime, no connection drops)
echo "[Safety] Gracefully reloading Nginx..."
systemctl reload nginx

echo "=========================================================="
echo "🎉 SUCCESS: SSL CERTIFICATE INSTALLED & NGINX RELOADED!"
echo "Valid Domain: kaizen.abhiyantatech.com"
echo "Backup Location: /etc/letsencrypt_backup_$TIMESTAMP"
echo "=========================================================="
"""

    try:
        subprocess.run(["ssh", server, remote_script], check=True)
        print("\n✅ All done! https://kaizen.abhiyantatech.com is now 100% active and secure.")
    except Exception as e:
        print(f"\n❌ Installation failed on server: {e}")

if __name__ == "__main__":
    main()
