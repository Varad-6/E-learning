import os
import zipfile
import hashlib
import shutil

EXCLUDE_PATTERNS = [
    "__pycache__", ".pyc", ".git", ".env", "node_modules", "scratch",
    "uploads", "venv", ".vite"
]

def should_exclude(rel_path):
    rel_normalized = rel_path.replace("\\", "/").lower()
    for pat in EXCLUDE_PATTERNS:
        if pat in rel_normalized:
            return True
    filename = os.path.basename(rel_normalized)
    if filename.startswith(("test_", "verify_", "patch_")) and not rel_normalized.startswith(("app/", "alembic/", "frontend/src/")):
        return True
    return False

def get_file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def package_phase2():
    print("=" * 75)
    print("📦 PACKAGING PHASE 2 PRODUCTION DEPLOYMENT ARCHIVES")
    print("=" * 75)

    base_dirs = [
        "app",
        "alembic",
        "frontend/src",
        "frontend/public",
        "frontend/dist"
    ]

    single_files = [
        "deploy_phase_2.py",
        "deploy.py",
        "DEPLOYMENT_PHASE_2.md",
        "start_local.ps1",
        "start_local.bat",
        "start_backend.bat",
        "start_frontend.bat",
        "alembic.ini",
        "requirements.txt",
        "seed_db.py",
        "seed_selected_users.py",
        "setup_backup_db.py",
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

    print(f"Total Phase 2 files selected: {len(files_to_pack)}")

    target_archives = [
        "deployment_phase_2.zip",
        "Kaizen_Deployment_Phase2.zip",
        "update.zip"
    ]

    primary_zip = target_archives[0]
    print(f"\n[1/3] Building primary archive: {primary_zip}...")
    with zipfile.ZipFile(primary_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for f in sorted(files_to_pack):
            zipf.write(f, arcname=f.replace("\\", "/"))

    size_mb = os.path.getsize(primary_zip) / (1024 * 1024)
    sha256 = get_file_hash(primary_zip)

    print(f"✅ Created {primary_zip} ({size_mb:.2f} MB | SHA256: {sha256})")

    # Create duplicates/aliases for convenient reference
    for alias in target_archives[1:]:
        shutil.copy2(primary_zip, alias)
        print(f"✅ Synced alias archive: {alias}")

    print("\n" + "=" * 75)
    print("PHASE 2 DEPLOYMENT PACKAGES SAVED SUCCESSFULLY TO ONEDRIVE DIRECTORY:")
    for arch in target_archives:
        abs_p = os.path.abspath(arch)
        print(f"  📁 {abs_p}")
    print("=" * 75)

if __name__ == "__main__":
    package_phase2()
