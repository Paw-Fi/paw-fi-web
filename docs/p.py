# Initialize the in-memory storage if not already present
if 'expenses' not in globals():
    expenses = []

def add_expense(text):
    """Parse messages like '2 on coke'."""
    parts = text.strip().split(" on ", 1)
    try:
        amount = float(parts[0])
    except Exception:
        return "Couldn't parse amount."
    description = parts[1] if len(parts) > 1 else "unspecified"
    expenses.append({"amount": amount, "description": description})
    return f"Added €{amount:.2f} for {description}."

def show_expenses():
    """Return a simple plain-text summary."""
    if not expenses:
        return "No expenses recorded yet."
    lines = [f"- €{e['amount']:.2f} on {e['description']}" for e in expenses]
    total = sum(e["amount"] for e in expenses)
    return "\n".join(lines) + f"\nTotal: €{total:.2f}"