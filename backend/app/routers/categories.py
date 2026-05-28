from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Category, Transaction
from app.models.account import Account
from app.schemas.category import CategoryOut, CategoryCreate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    return db.query(Category).filter(Category.account_id == account.id).order_by(Category.name).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    existing = db.query(Category).filter(
        Category.account_id == account.id, Category.name == data.name
    ).first()
    if existing:
        raise HTTPException(409, "A category with this name already exists")
    cat = Category(**data.model_dump(), account_id=account.id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    cat = db.query(Category).filter(Category.id == category_id, Category.account_id == account.id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    txn_count = db.query(Transaction).filter(
        Transaction.category_id == category_id, Transaction.account_id == account.id
    ).count()
    if txn_count > 0:
        raise HTTPException(
            409,
            f"Cannot delete: {txn_count} transaction(s) use this category. Reassign or delete them first.",
        )
    db.delete(cat)
    db.commit()
