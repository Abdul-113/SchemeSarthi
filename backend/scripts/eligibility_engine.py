"""
eligibility_engine.py
Deterministic, rule-based eligibility engine for Indian government schemes.
Processes user data against scheme rules and returns structured results.
"""

from scripts.scheme_rules import SCHEME_RULES
from typing import Any


def _parse_income(income_val: Any) -> int:
    """Safely parse income from string (e.g. '2,40,000', '2.4L') or int."""
    if income_val is None:
        return -1  # Unknown — don't penalize
    if isinstance(income_val, (int, float)):
        return int(income_val)
    s = str(income_val).replace(",", "").replace(" ", "").replace("₹", "")
    # Handle 'L' / 'lakh' notation
    if s.lower().endswith("l"):
        try:
            return int(float(s[:-1]) * 100000)
        except (ValueError, AttributeError):
            pass
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return -1


def _parse_age(age_val: Any) -> int:
    if age_val is None:
        return -1
    try:
        return int(age_val)
    except (ValueError, TypeError):
        return -1


def check_single_scheme(user_data: dict, scheme_key: str) -> dict:
    """
    Run a single scheme's rules against user data.
    Returns a detailed result with per-rule pass/fail breakdown.
    """
    scheme = SCHEME_RULES.get(scheme_key)
    if not scheme:
        return {"eligible": False, "score": 0, "rules_passed": [], "rules_failed": [], "rules_unknown": []}

    rules = scheme.get("rules", {})
    rules_passed = []
    rules_failed = []
    rules_unknown = []

    income = _parse_income(user_data.get("income"))
    age = _parse_age(user_data.get("age"))
    gender = (user_data.get("gender") or "").strip()
    category = (user_data.get("category") or "").strip()
    state = (user_data.get("state") or "").strip()
    occupation = (user_data.get("occupation") or "").strip()
    has_house = user_data.get("has_house")
    land_holding = user_data.get("land_holding")
    has_disability = user_data.get("has_disability", False)
    is_student = user_data.get("is_student", False)
    is_bpl = user_data.get("is_bpl", False)
    is_taxpayer = user_data.get("is_taxpayer", False)
    owns_four_wheeler = user_data.get("owns_four_wheeler", False)

    # ── Income check ──────────────────────────────────────────────────────────
    if "max_income" in rules:
        if income == -1:
            rules_unknown.append(f"Income: Cannot verify (not provided) — limit is ₹{rules['max_income']:,}")
        elif income <= rules["max_income"]:
            rules_passed.append(f"Income ₹{income:,} is within the ₹{rules['max_income']:,} limit ✓")
        else:
            rules_failed.append(f"Income ₹{income:,} exceeds the maximum limit of ₹{rules['max_income']:,}")

    # ── Age check ─────────────────────────────────────────────────────────────
    if "min_age" in rules:
        if age == -1:
            rules_unknown.append(f"Age: Cannot verify (not provided) — minimum is {rules['min_age']} years")
        elif age >= rules["min_age"]:
            rules_passed.append(f"Age {age} meets the minimum age of {rules['min_age']} years ✓")
        else:
            rules_failed.append(f"Age {age} is below the minimum required age of {rules['min_age']} years")

    if "max_age" in rules:
        if age == -1:
            rules_unknown.append(f"Age: Cannot verify — maximum is {rules['max_age']} years")
        elif age <= rules["max_age"]:
            rules_passed.append(f"Age {age} is within the maximum age limit of {rules['max_age']} years ✓")
        else:
            rules_failed.append(f"Age {age} exceeds the maximum allowed age of {rules['max_age']} years")

    # ── House ownership check ─────────────────────────────────────────────────
    if rules.get("requires_no_house"):
        if has_house is None:
            rules_unknown.append("House ownership: Cannot verify (not provided)")
        elif not has_house:
            rules_passed.append("Does not own a house — meets the no-house requirement ✓")
        else:
            rules_failed.append("Applicant already owns a house — this scheme is for first-time homebuyers")

    # ── Category check ────────────────────────────────────────────────────────
    if "categories_allowed" in rules:
        if not category:
            rules_unknown.append(f"Category: Cannot verify — scheme is for {', '.join(rules['categories_allowed'])}")
        elif category in rules["categories_allowed"]:
            rules_passed.append(f"Category '{category}' is eligible for this scheme ✓")
        else:
            rules_failed.append(f"Category '{category}' is not eligible — scheme is restricted to {', '.join(rules['categories_allowed'])}")

    # ── Occupation / Land check ───────────────────────────────────────────────
    if "occupation_types" in rules:
        if not occupation:
            rules_unknown.append(f"Occupation: Cannot verify — scheme is for {', '.join(rules['occupation_types'])}")
        elif any(o.lower() in occupation.lower() for o in rules["occupation_types"]):
            rules_passed.append(f"Occupation '{occupation}' qualifies for this scheme ✓")
        else:
            rules_failed.append(f"Occupation '{occupation}' does not qualify — scheme is for {', '.join(rules['occupation_types'])}")

    if rules.get("land_required"):
        if land_holding is None:
            rules_unknown.append("Land ownership: Cannot verify (not provided)")
        elif float(land_holding or 0) > 0:
            rules_passed.append(f"Land holding of {land_holding} hectares meets the requirement ✓")
        else:
            rules_failed.append("Must own agricultural land to be eligible for this scheme")

    # ── State check ───────────────────────────────────────────────────────────
    if "states_allowed" in rules and rules["states_allowed"]:
        if not state:
            rules_unknown.append(f"State: Cannot verify — scheme is available in: {', '.join(rules['states_allowed'])}")
        elif state in rules["states_allowed"]:
            rules_passed.append(f"State '{state}' is covered by this scheme ✓")
        else:
            rules_failed.append(f"This scheme is only available in: {', '.join(rules['states_allowed'])} — not in '{state}'")

    # ── Gender check ─────────────────────────────────────────────────────────
    if "gender_required" in rules:
        allowed_genders = rules["gender_required"]
        # Check if there's a category exception for gender
        exception_categories = rules.get("gender_exception_categories", [])
        if not gender:
            rules_unknown.append(f"Gender: Cannot verify — scheme is for {', '.join(allowed_genders)}")
        elif gender in allowed_genders:
            rules_passed.append(f"Gender '{gender}' is eligible for this scheme ✓")
        elif exception_categories and category in exception_categories:
            rules_passed.append(f"Category '{category}' provides an exception to the gender requirement ✓")
        else:
            rules_failed.append(f"Scheme is available only for: {', '.join(allowed_genders)}")

    # ── Disability check ────────────────────────────────────────────────────
    if rules.get("has_disability"):
        if has_disability:
            rules_passed.append("Has a disability — meets the eligibility criterion ✓")
        else:
            rules_failed.append("This scheme is exclusively for persons with disabilities (Divyang)")

    # ── Student check ────────────────────────────────────────────────────────
    if rules.get("is_student"):
        if is_student:
            rules_passed.append("Currently studying — meets the student eligibility criterion ✓")
        else:
            rules_failed.append("Must be a student currently enrolled in an educational institution")

    # ── BPL check ─────────────────────────────────────────────────────────────
    if rules.get("bpl_required"):
        if is_bpl:
            rules_passed.append("BPL card holder — meets the below-poverty-line criterion ✓")
        elif income != -1 and income < 100000:
            rules_passed.append(f"Income ₹{income:,} suggests BPL status ✓")
        else:
            rules_failed.append("Must hold a valid BPL (Below Poverty Line) ration card")

    # ── Taxpayer exclusion check ──────────────────────────────────────────────
    if rules.get("taxpayer_excluded"):
        if is_taxpayer:
            rules_failed.append("Family members who are income tax payers are not eligible for this scheme")
        else:
            rules_passed.append("Not an income tax payer — meets the non-taxpayer requirement ✓")

    # ── Four-wheeler exclusion check ──────────────────────────────────────────
    if rules.get("four_wheeler_excluded"):
        if owns_four_wheeler:
            rules_failed.append("Families owning a four-wheeler vehicle (excluding tractor) are not eligible")
        else:
            rules_passed.append("Does not own a four-wheeler — meets the vehicle requirement ✓")

    # ── Government employee exclusion check ───────────────────────────────────
    if rules.get("govt_employee_excluded"):
        is_govt = occupation and "govt" in occupation.lower()
        if is_govt:
            rules_failed.append("Government employees (regular/permanent) and pensioners are not eligible for this scheme")
        elif occupation:
            rules_passed.append(f"Occupation '{occupation}' is not a government position — eligible ✓")
        else:
            rules_unknown.append("Occupation: Cannot verify government employment status (not provided)")

    # ── Calculate score ───────────────────────────────────────────────────────
    total_checked = len(rules_passed) + len(rules_failed)
    score = int((len(rules_passed) / total_checked * 100)) if total_checked > 0 else 50

    # Handle case: all fields unknown (insufficient data)
    if total_checked == 0 and len(rules_unknown) > 0:
        eligible = None  # Indeterminate
        score = 0
    else:
        eligible = len(rules_failed) == 0

    return {
        "scheme_key": scheme_key,
        "scheme_name": scheme["name"],
        "ministry": scheme["ministry"],
        "description": scheme["description"],
        "benefit": scheme["benefit"],
        "apply_url": scheme["apply_url"],
        "tags": scheme["tags"],
        "eligible": eligible,
        "score": score,
        "rules_passed": rules_passed,
        "rules_failed": rules_failed,
        "rules_unknown": rules_unknown,
        "income_tiers": scheme.get("income_tiers"),
    }


def check_all_schemes(user_data: dict) -> dict:
    """
    Run all scheme rules against user_data.
    Returns structured results sorted by eligibility, then score.
    """
    all_results = []

    for scheme_key in SCHEME_RULES:
        result = check_single_scheme(user_data, scheme_key)
        all_results.append(result)

    # Sort: fully eligible first, then partial (unknown), then ineligible
    def sort_key(r):
        if r["eligible"] is True:
            return (0, -r["score"])
        elif r["eligible"] is None:
            return (1, -r["score"])
        else:
            return (2, -r["score"])

    all_results.sort(key=sort_key)

    eligible_schemes = [r for r in all_results if r["eligible"] is True]
    partial_schemes  = [r for r in all_results if r["eligible"] is None]
    ineligible_schemes = [r for r in all_results if r["eligible"] is False]

    return {
        "total_schemes_checked": len(all_results),
        "eligible_count": len(eligible_schemes),
        "partial_count": len(partial_schemes),
        "ineligible_count": len(ineligible_schemes),
        "eligible_schemes": eligible_schemes,
        "partial_schemes": partial_schemes,
        "ineligible_schemes": ineligible_schemes,
        "all_results": all_results,
    }


def generate_ai_prompt_context(user_data: dict, top_eligible: list) -> str:
    """
    Build a concise prompt context for the AI narrative layer.
    """
    income = _parse_income(user_data.get("income"))
    income_str = f"₹{income:,}" if income != -1 else "not specified"

    user_summary = (
        f"User Profile:\n"
        f"- Age: {user_data.get('age', 'Not specified')}\n"
        f"- Gender: {user_data.get('gender', 'Not specified')}\n"
        f"- State: {user_data.get('state', 'Not specified')}\n"
        f"- Category: {user_data.get('category', 'Not specified')}\n"
        f"- Annual Income: {income_str}\n"
        f"- Occupation: {user_data.get('occupation', 'Not specified')}\n"
        f"- Owns a house: {'Yes' if user_data.get('has_house') else 'No' if user_data.get('has_house') is False else 'Not specified'}\n"
        f"- Is a student: {'Yes' if user_data.get('is_student') else 'No'}\n"
        f"- Has disability: {'Yes' if user_data.get('has_disability') else 'No'}\n"
    )
    eligible_summary = ""
    if top_eligible:
        eligible_summary = "\nTop eligible schemes:\n"
        for i, s in enumerate(top_eligible[:3], 1):
            eligible_summary += f"{i}. {s['scheme_name']} — {s['benefit']}\n"

    return user_summary + eligible_summary
