"""Add lifestyle logs

Revision ID: 002
Revises: 001
Create Date: 2026-02-27 16:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'lifestyle_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('sleep_hours', sa.Float(), nullable=True),
        sa.Column('sleep_quality', sa.String(length=50), nullable=True),
        sa.Column('activity_level', sa.String(length=50), nullable=True),
        sa.Column('diet_type', sa.String(length=100), nullable=True),
        sa.Column('alcohol_units_per_week', sa.Float(), nullable=True),
        sa.Column('smoking_status', sa.String(length=50), nullable=True),
        sa.Column('stress_level', sa.Integer(), nullable=True),
        sa.Column('food_log', sa.Text(), nullable=True),
        sa.Column('water_intake_liters', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lifestyle_logs_user_id'), 'lifestyle_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_lifestyle_logs_id'), 'lifestyle_logs', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_lifestyle_logs_id'), table_name='lifestyle_logs')
    op.drop_index(op.f('ix_lifestyle_logs_user_id'), table_name='lifestyle_logs')
    op.drop_table('lifestyle_logs')
