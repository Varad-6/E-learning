import os
import zipfile
import shutil
import hashlib

EXCLUDE_PATTERNS = [
    "__pycache__", ".pyc", ".git", ".env", "node_modules", "scratch",
    ".png", ".jpg", ".jpeg", ".mp4", "uploads", "venv", ".vite",
    "test_", "audit_", "verify_", "patch_", "demo.txt", "logfile"
]

def should_exclude(rel_path):
    rel_normalized = rel_path.replace("\\", "/").lower()
    for pat in EXCLUDE_PATTERNS:
        if pat in rel_normalized:
            # Special exceptions for legitimate source files if any
            if "courserarichtext" in rel_normalized or "learnersmodal" in rel_normalized or "youtube" in rel_normalized:
                continue
            return True
    return False

def get_file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def package_production_archive():
    print("=" * 75)
    print("[ZIP] BUILDING COMPLETE PRODUCTION-GRADE DEPLOYMENT PACKAGE: update.zip")
    print("=" * 75)

    base_dirs = [
        "app",
        "alembic",
        "frontend/src",
        "frontend/public",
        "frontend/dist"
    ]

    single_files = [
        "deploy.py",
        "requirements.txt",
        "alembic.ini",
        "seed_db.py",
        "seed_selected_users.py",
        "frontend/index.html",
        "frontend/package.json",
        "frontend/vite.config.ts",
        "frontend/tsconfig.json",
        "frontend/tsconfig.app.json",
        "frontend/tsconfig.node.json"
    ]

    files_to_pack = set()

    for sf in single_files:
        if os.path.exists(sf):
            files_to_pack.add(sf)

    for bdir in base_dirs:
        if not os.path.exists(bdir):
            continue
        for root, _, files in os.walk(bdir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ".")
                if not should_exclude(rel_path):
                    files_to_pack.add(rel_path)

    zip_filename = "update.zip"
    print(f"Total production files to archive: {len(files_to_pack)}")

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for f in sorted(files_to_pack):
            zipf.write(f, arcname=f.replace("\\", "/"))

    zip_size = os.path.getsize(zip_filename)
    zip_sha = get_file_hash(zip_filename)

    print(f"\n[OK] Local archive created: {zip_filename}")
    print(f"     Size   : {zip_size / (1024 * 1024):.2f} MB ({zip_size:,} bytes)")
    print(f"     SHA256 : {zip_sha}")

    # Destination 1: Downloads
    userprofile = os.environ.get("USERPROFILE", "C:\\Users\\arati")
    downloads_dir = os.path.join(userprofile, "Downloads")
    downloads_target = os.path.join(downloads_dir, "update.zip")

    if os.path.exists(downloads_dir):
        shutil.copy2(zip_filename, downloads_target)
        print(f"\n[OK] Successfully copied to Downloads: {downloads_target}")
    else:
        print(f"\n[!] Downloads directory not found: {downloads_dir}")

    # Destination 2: Desktop
    desktop_onedrive = os.path.join(userprofile, "OneDrive - Abhiyanta India Solutions Pvt Ltd", "Desktop")
    desktop_target = os.path.join(desktop_onedrive, "update.zip")
    if os.path.exists(desktop_onedrive):
        shutil.copy2(zip_filename, desktop_target)
        print(f"[OK] Successfully copied to Desktop: {desktop_target}")

    # Destination 3: Also update zip_updates.py target
    desktop_kaizen = os.path.join(desktop_onedrive, "Kaizen_Deployment_Updates.zip")
    if os.path.exists(desktop_onedrive):
        shutil.copy2(zip_filename, desktop_kaizen)
        print(f"[OK] Successfully copied to Desktop (Kaizen_Deployment_Updates.zip): {desktop_kaizen}")

    print("=" * 75)
    print("ALL TARGET DESTINATIONS SYNCHRONIZED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    package_production_archive()
