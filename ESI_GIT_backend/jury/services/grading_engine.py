import math
import logging
from jury.models import GradingFormula

logger = logging.getLogger(__name__)

# Allowed safe math functions admin can use in formula
ALLOWED_FUNCTIONS = {
    "min": min,
    "max": max,
    "round": round,
    "abs": abs,
    "sqrt": math.sqrt,
}

# Dummy grades used to validate formula before saving
TEST_GRADES = {"g1": 15.0, "g2": 14.0, "g3": 16.0}


# ─────────────────────────────────────────
# Validate formula BEFORE saving it
# ─────────────────────────────────────────
def validate_formula(expression: str):
    if not expression or not expression.strip():
        return False, "Formula cannot be empty"

    try:
        result = eval(
            expression,
            {"__builtins__": {}},
            {**ALLOWED_FUNCTIONS, **TEST_GRADES},
        )

        if not isinstance(result, (int, float)):
            return False, "Formula must return a number"

        if result < 0 or result > 20:
            return False, "Formula result must be between 0 and 20"

        return True, None

    except ZeroDivisionError:
        return False, "Division by zero detected"

    except NameError as e:
        return False, f"Unknown variable/function: {str(e)}"

    except SyntaxError as e:
        return False, f"Syntax error: {e.msg}"

    except Exception as e:
        return False, f"Formula error: {str(e)}"


# ─────────────────────────────────────────
# Get active formula
# ─────────────────────────────────────────
def get_active_formula():
    return GradingFormula.objects.filter(is_active=True).first()


# ─────────────────────────────────────────
# Calculate final grade using active formula
# ─────────────────────────────────────────
def calculate_final_grade(grades: dict):
    """
    grades = {"g1": float, "g2": float, "g3": float}
    """

    formula = get_active_formula()

    # fallback if no formula exists
    if not formula:
        avg = round((grades["g1"] + grades["g2"] + grades["g3"]) / 3, 2)
        logger.warning("No active formula → using average")
        return avg, None

    try:
        result = eval(
            formula.formula_expression,
            {"__builtins__": {}},
            {**ALLOWED_FUNCTIONS, **grades},
        )

        final = round(float(result), 2)
        final = max(0.0, min(20.0, final))  # clamp 0-20

        return final, formula

    except Exception as e:
        logger.error(f"Formula crashed → fallback average: {e}")
        avg = round((grades["g1"] + grades["g2"] + grades["g3"]) / 3, 2)
        return avg, None
