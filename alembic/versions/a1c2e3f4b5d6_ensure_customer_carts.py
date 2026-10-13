"""ensure customer_carts exists on databases adopted with `alembic stamp head`

Revision ID: a1c2e3f4b5d6
Revises: 693ac2f8dc83
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1c2e3f4b5d6"
down_revision = "693ac2f8dc83"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "customer_carts" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "customer_carts",
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cart_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    pass  # table may predate this migration; leave it in place
