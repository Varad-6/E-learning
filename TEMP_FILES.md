# Temporary Files Manifest

This file tracks all temporary/throwaway files created during development.

| Path | Purpose | Safe-to-delete Condition |
| :--- | :--- | :--- |
| `scratch/tmp_check_db.py` | Verify columns added by Alembic migration | After migration is verified and final features are ready |
| `scratch/tmp_test_difficulty_tiers.py` | Unit test Difficulty Tiers and Sequential Lock logic | After backend integration verification is fully complete |
| `scratch/tmp_test_badge_system.py` | Unit test Badge Tier auto-progression milestones | After backend integration verification is fully complete |
| `scratch/tmp_test_manager_dashboard.py` | Unit test Manager Dashboard department isolation and aggregates | After backend integration verification is fully complete |
| `scratch/tmp_test_manager_reporting.py` | Unit test Manager Reporting department isolation and details | After backend integration verification is fully complete |
| `scratch/tmp_check_db_conn.py` | Verify active local postgres ports and credentials | Once db connection succeeds |
| `scratch/tmp_audit_db.py` | Full database schema, row counts, and FK indexes audit | After full QA pass |
| `scratch/tmp_api_audit.py` | Initial API route enumeration and status code test | After full QA pass |
| `scratch/tmp_verify_final.py` | Comprehensive 45-point E2E verification test suite | After full QA pass |
| `scratch/tmp_docker_test.py` | Docker container port and health verification script | After full QA pass |
| `scratch/tmp_test_course_creation.py` | Course & Module end-to-end creation test script | After deployment bundle generation |
| `scratch/tmp_find_missing_files.py` | Detect missing repository files in deployment zip | After deployment bundle generation |
| `scratch/tmp_patch_quiz.py` | Patch quiz schemas & services for 422 fix | After deployment bundle generation |
| `scratch/tmp_patch_course_schema.py` | Patch course schema status type | After deployment bundle generation |
| `scratch/tmp_build_complete_zip.py` | Package complete self-contained update archives | After deployment bundle generation |
| `scratch/tmp_update_changelog.py` | Update CHANGELOG.md with release notes | After deployment bundle generation |
