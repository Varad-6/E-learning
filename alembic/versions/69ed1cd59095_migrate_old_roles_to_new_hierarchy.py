"""migrate old roles to new hierarchy

Revision ID: 69ed1cd59095
Revises: 3ad91bd45fc4
Create Date: 2026-07-08 10:11:03.641072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69ed1cd59095'
down_revision: Union[str, Sequence[str], None] = '3ad91bd45fc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename ADMIN to SYSTEM_ADMIN
    op.execute("UPDATE roles SET name = 'SYSTEM_ADMIN' WHERE name = 'ADMIN'")
    # Rename MANAGER to COURSE_MANAGER
    op.execute("UPDATE roles SET name = 'COURSE_MANAGER' WHERE name = 'MANAGER'")
    # Insert HR_ADMIN
    op.execute(
        "INSERT INTO roles (id, name, created_at) "
        "VALUES ('a0a0a0a0-0000-0000-0000-000000000004', 'HR_ADMIN', NOW()) "
        "ON CONFLICT (name) DO NOTHING"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Delete HR_ADMIN mapping first from user_roles if any exist (though cascade delete is configured)
    op.execute(
        "DELETE FROM user_roles WHERE role_id = 'a0a0a0a0-0000-0000-0000-000000000004'"
    )
    # Delete HR_ADMIN role
    op.execute("DELETE FROM roles WHERE name = 'HR_ADMIN'")
    # Restore COURSE_MANAGER to MANAGER
    op.execute("UPDATE roles SET name = 'MANAGER' WHERE name = 'COURSE_MANAGER'")
    # Restore SYSTEM_ADMIN to ADMIN
    op.execute("UPDATE roles SET name = 'ADMIN' WHERE name = 'SYSTEM_ADMIN'")
