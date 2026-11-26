import os
import zipfile
import shutil
import hashlib

EXCLUDE_DIRS = {
    ".git", "node_modules", "venv", "__pycache__", "scratch",
    ".vscode", ".agents", "anti-slop-main"
}

EXCLUDE_EXTS = {
    ".pyc", ".pyo", ".pyd", ".log"
}

def should_exclude(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
        if part.endswith(".tmp") or part.startswith(".git"):
            return True
    _, ext = os.path.splitext(rel_path)
    if ext.lower() in EXCLUDE_EXTS:
        return True
    return False

def get_file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def create_zip():
    zip_name = "Kaizen_LMS_Updated.zip"
    print("=" * 70)
    print("CREATING COMPLETE REDEPLOYMENT ARCHIVE: " + zip_name)
    print("=" * 70)

    # Directories to traverse
    include_dirs = [
        "app",
        "alembic",
        "init-db",
        "frontend/src",
        "frontend/public",
        "frontend/dist"
    ]

    # Individual root or config files
    single_files = [
        "docker-compose.yml",
        "Dockerfile",
        "requirements.txt",
        "start.sh",
        "alembic.ini",
        ".env",
        ".env.example",
        "seed_db.py",
        "seed_selected_users.py",
        "deploy.bat",
        "deploy.sh",
        "restore_database.bat",
        "restore_database.sh",
        "README_DEPLOY.md",
        "frontend/package.json",
        "frontend/package-lock.json",
        "frontend/vite.config.ts",
        "frontend/tsconfig.json",
        "frontend/tsconfig.app.json",
        "frontend/tsconfig.node.json",
        "frontend/index.html",
        "frontend/Dockerfile",
        "frontend/nginx.conf"
    ]

    files_to_pack = set()

    for sf in single_files:
        if os.path.exists(sf):
            files_to_pack.add(sf)
        else:
            print(f"[WARN] File not found: {sf}")

    for d in include_dirs:
        if not os.path.exists(d):
            print(f"[WARN] Directory not found: {d}")
            continue
        for root, _, files in os.walk(d):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ".")
                if not should_exclude(rel_path):
                    files_to_pack.add(rel_path)

    print(f"Total files selected to package: {len(files_to_pack)}")

    with zipfile.ZipFile(zip_name, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for f in sorted(files_to_pack):
            zf.write(f, arcname=f.replace("\\", "/"))

    size_bytes = os.path.getsize(zip_name)
    sha256 = get_file_hash(zip_name)

    print(f"\n[OK] Archive created: {zip_name}")
    print(f"     Size   : {size_bytes / (1024 * 1024):.2f} MB ({size_bytes:,} bytes)")
    print(f"     SHA256 : {sha256}")

    # Copy to Desktop
    userprofile = os.environ.get("USERPROFILE", r"C:\Users\arati")
    desktop_onedrive = os.path.join(userprofile, "OneDrive - Abhiyanta India Solutions Pvt Ltd", "Desktop")
    if os.path.exists(desktop_onedrive):
        desktop_dst = os.path.join(desktop_onedrive, zip_name)
        shutil.copy2(zip_name, desktop_dst)
        print(f"[OK] Copied to Desktop: {desktop_dst}")

    # Copy to Downloads
    downloads = os.path.join(userprofile, "Downloads")
    if os.path.exists(downloads):
        downloads_dst = os.path.join(downloads, zip_name)
        shutil.copy2(zip_name, downloads_dst)
        print(f"[OK] Copied to Downloads: {downloads_dst}")

    print("=" * 70)
    print("ALL DONE!")

if __name__ == "__main__":
    create_zip()
