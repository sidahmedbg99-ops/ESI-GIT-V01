import math
import logging
from jury.models import GradingFormula

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# Allowed functions admin can use in formula
# ─────────────────────────────────────────

ALLOWED_FUNCTIONS = {
    "min":   min,
    "max":   max,
    "round": round,
    "abs":   abs,
    "sqrt":  math.sqrt,
}


# ─────────────────────────────────────────
# Get active formula
# ─────────────────────────────────────────

def get_active_formula():
    return GradingFormula.objects.filter(is_active=True).first()


# ─────────────────────────────────────────
# Validate formula before saving
# ─────────────────────────────────────────

def validate_formula(expression: str, labels: dict):
    """
    Runs the formula with dummy values (15.0 for each variable)
    to catch errors before the admin saves it.
    labels = {"g1": "Continuous work", "g2": "Final product", ...}
    """
    if not expression or not expression.strip():
        return False, "Formula cannot be empty"
    if not labels:
        return False, "Labels cannot be empty"

    test_grades = {var: 15.0 for var in labels.keys()}

    try:
        result = eval(
            expression,
            {"__builtins__": {}},
            {**ALLOWED_FUNCTIONS, **test_grades},
        )

        if not isinstance(result, (int, float)):
            return False, "Formula must return a number"

        if result < 0 or result > 20:
            return False, "Formula result must be between 0 and 20"

        return True, None

    except ZeroDivisionError:
        return False, "Division by zero detected"
    except NameError as e:
        return False, f"Unknown variable or function: {str(e)}"
    except SyntaxError as e:
        return False, f"Syntax error: {e.msg}"
    except Exception as e:
        return False, f"Formula error: {str(e)}"


# ─────────────────────────────────────────
# Calculate final grade
# ─────────────────────────────────────────

def calculate_final_grade(values: dict):
    """
    Called from Grades.save().
    values = {"g1": 15.0, "g2": 14.0, ...} — must be complete, view validates this first.
    Returns float or None if no active formula.
    """
    formula = get_active_formula()

    if not formula:
        logger.warning("No active formula found — cannot calculate grade")
        return None

    try:
        result = eval(
            formula.expression,
            {"__builtins__": {}},
            {**ALLOWED_FUNCTIONS, **{k: float(v) for k, v in values.items()}},
        )
        return round(max(0.0, min(20.0, float(result))), 2)

    except Exception as e:
        logger.error(f"Grading engine error: {e}")
        return None