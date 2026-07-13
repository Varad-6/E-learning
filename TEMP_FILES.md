# Temporary Files Manifest

This file tracks all temporary/throwaway files created during development.

| Path | Purpose | Safe-to-delete Condition |
| :--- | :--- | :--- |
| `scratch/tmp_check_db.py` | Verify columns added by Alembic migration | After migration is verified and final features are ready |
| `scratch/tmp_test_difficulty_tiers.py` | Unit test Difficulty Tiers and Sequential Lock logic | After backend integration verification is fully complete |
