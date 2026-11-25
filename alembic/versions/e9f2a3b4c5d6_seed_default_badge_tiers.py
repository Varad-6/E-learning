"""seed_default_badge_tiers

Revision ID: e9f2a3b4c5d6
Revises: d8e1a2b3c4d5
Create Date: 2026-11-25 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision: str = 'e9f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd8e1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_BADGE_TIERS = [
    ("Bronze III", 1, "bronze_3", 1, 60),
    ("Bronze II", 2, "bronze_2", 2, 60),
    ("Bronze I", 3, "bronze_1", 3, 60),
    ("Silver III", 4, "silver_3", 4, 60),
    ("Silver II", 5, "silver_2", 5, 60),
    ("Silver I", 6, "silver_1", 6, 60),
    ("Gold III", 7, "gold_3", 7, 60),
    ("Gold II", 8, "gold_2", 8, 60),
    ("Gold I", 9, "gold_1", 9, 60),
    ("Ruby Crest", 10, "ruby_crest", 10, 60),
    ("Amethyst III", 11, "amethyst_3", 11, 60),
    ("Amethyst II", 12, "amethyst_2", 12, 60),
    ("Amethyst I", 13, "amethyst_1", 13, 60),
    ("Emerald III", 14, "emerald_3", 14, 60),
    ("Emerald II", 15, "emerald_2", 15, 60),
    ("Emerald I", 16, "emerald_1", 16, 60),
    ("Sapphire III", 17, "sapphire_3", 17, 60),
    ("Sapphire II", 18, "sapphire_2", 18, 60),
    ("Sapphire I", 19, "sapphire_1", 19, 60),
    ("Diamond Crest", 20, "diamond_crest", 20, 60),
]


def upgrade() -> None:
    conn = op.get_bind()
    existing_count = conn.execute(sa.text("SELECT COUNT(*) FROM badge_tiers")).scalar()
    if not existing_count:
        for name, tier_order, icon_asset_ref, courses_req, min_score in DEFAULT_BADGE_TIERS:
            conn.execute(
                sa.text(
                    "INSERT INTO badge_tiers (id, name, tier_order, icon_asset_ref, courses_required_cumulative, min_score_percent) "
                    "VALUES (:id, :name, :tier_order, :icon_asset_ref, :courses_req, :min_score) "
                    "ON CONFLICT (name) DO NOTHING"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "tier_order": tier_order,
                    "icon_asset_ref": icon_asset_ref,
                    "courses_req": courses_req,
                    "min_score": min_score,
                },
            )


def downgrade() -> None:
    pass
