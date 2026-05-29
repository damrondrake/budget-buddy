from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Budget, BudgetLineItem, Category
from app.models.account import Account
from app.schemas.budget import (
    BudgetCreate,
    BudgetOut,
    BudgetCopy,
    BudgetCopyResult,
    BudgetLineItemCreate,
    BudgetLineItemOut,
    BudgetPaidUpdate,
)

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _enrich(b: Budget) -> BudgetOut:
    return BudgetOut(
        id=b.id,
        category_id=b.category_id,
        month=b.month,
        year=b.year,
        amount_limit=b.amount_limit,
        note=b.note,
        paid=b.paid,
        category_name=b.category.name if b.category else None,
        line_items=[
            BudgetLineItemOut(id=li.id, label=li.label, amount=li.amount)
            for li in b.line_items
        ],
    )


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    budgets = db.query(Budget).filter(
        Budget.account_id == account.id, Budget.month == month, Budget.year == year
    ).all()
    return [_enrich(b) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=201)
def upsert_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    if not db.query(Category).filter(Category.id == data.category_id, Category.account_id == account.id).first():
        raise HTTPException(404, "Category not found")
    existing = db.query(Budget).filter(
        Budget.account_id == account.id,
        Budget.category_id == data.category_id,
        Budget.month == data.month,
        Budget.year == data.year,
    ).first()
    if existing:
        existing.amount_limit = data.amount_limit
        existing.note = data.note
        db.commit()
        db.refresh(existing)
        return _enrich(existing)
    b = Budget(**data.model_dump(), account_id=account.id)
    db.add(b)
    db.commit()
    db.refresh(b)
    return _enrich(b)


@router.post("/copy", response_model=BudgetCopyResult)
def copy_budgets(
    data: BudgetCopy,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    source = db.query(Budget).filter(
        Budget.account_id == account.id,
        Budget.month == data.from_month,
        Budget.year == data.from_year,
    ).all()
    if not source:
        raise HTTPException(404, "No budgets found from the source month")

    existing_cats = {
        b.category_id
        for b in db.query(Budget).filter(
            Budget.account_id == account.id,
            Budget.month == data.to_month,
            Budget.year == data.to_year,
        ).all()
    }

    copied = 0
    for b in source:
        if b.category_id not in existing_cats:
            new_budget = Budget(
                category_id=b.category_id,
                month=data.to_month,
                year=data.to_year,
                amount_limit=b.amount_limit,
                note=b.note,
                account_id=account.id,
            )
            db.add(new_budget)
            # Flush so new_budget.id is assigned before we attach line items.
            db.flush()
            for li in b.line_items:
                db.add(BudgetLineItem(
                    budget_id=new_budget.id,
                    label=li.label,
                    amount=li.amount,
                    account_id=account.id,
                ))
            copied += 1

    db.commit()
    return BudgetCopyResult(
        copied=copied,
        message=f"Copied {copied} budget(s)" if copied > 0 else "All budgets already exist for this month",
    )


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.account_id == account.id
    ).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    # Budget.line_items has cascade="all, delete-orphan", so the ORM deletes the
    # children when we delete the parent.
    db.delete(budget)
    db.commit()


@router.put("/{budget_id}/paid", response_model=BudgetOut)
def set_budget_paid(
    budget_id: int,
    data: BudgetPaidUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.account_id == account.id
    ).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    budget.paid = data.paid
    db.commit()
    db.refresh(budget)
    return _enrich(budget)


@router.post("/{budget_id}/items", response_model=BudgetLineItemOut, status_code=201)
def add_line_item(
    budget_id: int,
    data: BudgetLineItemCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.account_id == account.id
    ).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    item = BudgetLineItem(
        budget_id=budget.id,
        label=data.label,
        amount=data.amount,
        account_id=account.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return BudgetLineItemOut(id=item.id, label=item.label, amount=item.amount)


@router.put("/{budget_id}/items/{item_id}", response_model=BudgetLineItemOut)
def update_line_item(
    budget_id: int,
    item_id: int,
    data: BudgetLineItemCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    item = db.query(BudgetLineItem).filter(
        BudgetLineItem.id == item_id,
        BudgetLineItem.budget_id == budget_id,
        BudgetLineItem.account_id == account.id,
    ).first()
    if not item:
        raise HTTPException(404, "Line item not found")
    item.label = data.label
    item.amount = data.amount
    db.commit()
    db.refresh(item)
    return BudgetLineItemOut(id=item.id, label=item.label, amount=item.amount)


@router.delete("/{budget_id}/items/{item_id}", status_code=204)
def delete_line_item(
    budget_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    item = db.query(BudgetLineItem).filter(
        BudgetLineItem.id == item_id,
        BudgetLineItem.budget_id == budget_id,
        BudgetLineItem.account_id == account.id,
    ).first()
    if not item:
        raise HTTPException(404, "Line item not found")
    db.delete(item)
    db.commit()
