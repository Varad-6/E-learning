import os
import zipfile
import shutil
import hashlib

EXCLUDE_PATTERNS = [
    "__pycache__", ".pyc", ".git", ".env", "node_modules", "scratch",
    ".mp4", "uploads", "venv", ".vite",
    "test_", "audit_", "verify_", "patch_", "demo.txt", "logfile"
]

def should_exclude(rel_path):
    rel_normalized = rel_path.replace("\\", "/").lower()
    
    # ALWAYS preserve production static assets and badge images
    if "badges" in rel_normalized or "dist/" in rel_normalized or "public/" in rel_normalized:
        for pat in ["__pycache__", ".pyc", "node_modules", ".vite", ".git"]:
            if pat in rel_normalized:
                return True
        return False

    for pat in EXCLUDE_PATTERNS:
        if pat in rel_normalized:
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
    print("[ZIP] BUILDING COMPLETE PRODUCTION-GRADE DEPLOYMENT PACKAGE")
    print("=" * 75)

    base_dirs = [
        "app",
        "alembic",
        "frontend/src",
        "frontend/public",
        "frontend/dist"
    ]

    single_files = [
        "Dockerfile",
        "docker-compose.yml",
        "start.sh",
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
            # Mirror frontend/dist to dist/ for nginx webroot compatibility
            if f.replace("\\", "/").startswith("frontend/dist/"):
                dist_arcname = f.replace("\\", "/").replace("frontend/dist/", "dist/")
                zipf.write(f, arcname=dist_arcname)

    zip_size = os.path.getsize(zip_filename)
    zip_sha = get_file_hash(zip_filename)

    print(f"\n[OK] Local archive created: {zip_filename}")
    print(f"     Size   : {zip_size / (1024 * 1024):.2f} MB ({zip_size:,} bytes)")
    print(f"     SHA256 : {zip_sha}")

    # Targets to synchronize
    userprofile = os.environ.get("USERPROFILE", r"C:\Users\Varad")
    downloads_dir = os.path.join(userprofile, "Downloads")
    
    destinations = [
        os.path.join(downloads_dir, "update.zip"),
        os.path.join(downloads_dir, "update1.zip"),
    ]

    # Check for desktop targets
    desktop_onedrive = os.path.join(userprofile, "OneDrive - Abhiyanta India Solutions Pvt Ltd", "Desktop")
    if os.path.exists(desktop_onedrive):
        destinations.append(os.path.join(desktop_onedrive, "update.zip"))
        destinations.append(os.path.join(desktop_onedrive, "Kaizen_Deployment_Updates.zip"))

    standard_desktop = os.path.join(userprofile, "Desktop")
    if os.path.exists(standard_desktop):
        destinations.append(os.path.join(standard_desktop, "update.zip"))

    for dest in destinations:
        dest_dir = os.path.dirname(dest)
        if os.path.exists(dest_dir):
            try:
                shutil.copy2(zip_filename, dest)
                print(f"[OK] Synced to: {dest}")
            except Exception as e:
                print(f"[!] Failed copying to {dest}: {e}")

    print("=" * 75)
    print("ALL PRODUCTION DEPLOYMENT PACKAGES SYNCHRONIZED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    package_production_archive()
