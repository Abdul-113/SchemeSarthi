"""
scheme_rules.py
Comprehensive Indian Government Scheme Rules Database
Each scheme defines structured, deterministic eligibility criteria.
"""

SCHEME_RULES = {

    # ─── HOUSING ──────────────────────────────────────────────────────────────

    "PMAY_Urban": {
        "name": "Pradhan Mantri Awas Yojana (Urban)",
        "ministry": "Ministry of Housing & Urban Affairs",
        "description": "Credit-linked subsidy for EWS/LIG/MIG households to build or buy homes in urban areas.",
        "benefit": "Interest subsidy up to ₹2.67 lakh on home loans",
        "apply_url": "https://pmaymis.gov.in",
        "tags": ["Housing"],
        "rules": {
            "max_income": 1800000,          # MIG-II ceiling (₹18L)
            "min_age": 18,
            "requires_no_house": True,
            "states_allowed": None,         # National scheme
            "gender_priority": "Female",    # Women co-owner preferred
        },
        "income_tiers": [
            {"label": "EWS", "max": 300000,   "benefit": "Interest subsidy 6.5% on ₹6L loan"},
            {"label": "LIG", "max": 600000,   "benefit": "Interest subsidy 6.5% on ₹6L loan"},
            {"label": "MIG-I", "max": 1200000, "benefit": "Interest subsidy 4% on ₹9L loan"},
            {"label": "MIG-II","max": 1800000, "benefit": "Interest subsidy 3% on ₹12L loan"},
        ]
    },

    "PMAY_Gramin": {
        "name": "Pradhan Mantri Awas Yojana (Gramin)",
        "ministry": "Ministry of Rural Development",
        "description": "Free pucca houses for rural BPL households.",
        "benefit": "₹1.2 lakh (plain areas) or ₹1.3 lakh (hilly areas) for house construction",
        "apply_url": "https://pmayg.nic.in",
        "tags": ["Housing"],
        "rules": {
            "max_income": 200000,
            "min_age": 18,
            "requires_no_house": True,
            "occupation_types": ["Farmer", "Labourer", "Artisan"],
        }
    },

    # ─── AGRICULTURE ──────────────────────────────────────────────────────────

    "PM_Kisan": {
        "name": "PM Kisan Samman Nidhi",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "description": "Direct income support of ₹6,000 per year to all small and marginal farmer families.",
        "benefit": "₹6,000/year (₹2,000 every 4 months) directly to bank account",
        "apply_url": "https://pmkisan.gov.in",
        "tags": ["Agriculture"],
        "rules": {
            "min_age": 18,
            "occupation_types": ["Farmer"],
            "land_required": True,
            "excluded_categories": ["Government Employee", "Tax Payer"],
        }
    },

    "Kisan_Credit_Card": {
        "name": "Kisan Credit Card (KCC)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "description": "Flexible revolving credit for farmers covering cultivation & other needs.",
        "benefit": "Revolving credit up to ₹3 lakh at 4% interest per year",
        "apply_url": "https://www.nabard.org/kcc.aspx",
        "tags": ["Agriculture", "Finance"],
        "rules": {
            "min_age": 18,
            "occupation_types": ["Farmer"],
            "land_required": True,
        }
    },

    "PM_Fasal_Bima": {
        "name": "Pradhan Mantri Fasal Bima Yojana",
        "ministry": "Ministry of Agriculture",
        "description": "Crop insurance scheme providing financial support to farmers suffering crop loss.",
        "benefit": "Claim amount as per sum insured; farmers pay only 1.5-5% premium",
        "apply_url": "https://pmfby.gov.in",
        "tags": ["Agriculture"],
        "rules": {
            "min_age": 18,
            "occupation_types": ["Farmer"],
            "land_required": True,
        }
    },

    # ─── HEALTH ────────────────────────────────────────────────────────────────

    "PMJAY_Ayushman": {
        "name": "Pradhan Mantri Jan Arogya Yojana (Ayushman Bharat)",
        "ministry": "Ministry of Health & Family Welfare",
        "description": "Health coverage of ₹5 lakh per family per year for secondary and tertiary care hospitalization.",
        "benefit": "Up to ₹5 lakh health insurance per family per year",
        "apply_url": "https://pmjay.gov.in",
        "tags": ["Health"],
        "rules": {
            "max_income": 200000,
            "min_age": 0,
            "categories_allowed": ["SC", "ST", "OBC", "General"],
            "bpl_preferred": True,
        }
    },

    # ─── EDUCATION / SCHOLARSHIPS ─────────────────────────────────────────────

    "SC_Scholarship_PostMatric": {
        "name": "Post-Matric Scholarship for SC Students",
        "ministry": "Ministry of Social Justice & Empowerment",
        "description": "Scholarship for SC students pursuing post-matriculation or post-secondary courses.",
        "benefit": "Full tuition + maintenance allowance (₹380–₹1,200/month)",
        "apply_url": "https://scholarships.gov.in",
        "tags": ["Education"],
        "rules": {
            "max_income": 250000,
            "min_age": 15,
            "max_age": 35,
            "categories_allowed": ["SC"],
            "is_student": True,
        }
    },

    "ST_Scholarship_PostMatric": {
        "name": "Post-Matric Scholarship for ST Students",
        "ministry": "Ministry of Tribal Affairs",
        "description": "Scholarship for ST students pursuing post-matric education.",
        "benefit": "Full tuition + maintenance allowance",
        "apply_url": "https://scholarships.gov.in",
        "tags": ["Education"],
        "rules": {
            "max_income": 250000,
            "min_age": 15,
            "max_age": 35,
            "categories_allowed": ["ST"],
            "is_student": True,
        }
    },

    "OBC_Scholarship_PreMatric": {
        "name": "Pre-Matric Scholarship for OBC Students",
        "ministry": "Ministry of Social Justice & Empowerment",
        "description": "Scholarship for OBC students from Class 1 to Class 10.",
        "benefit": "Day scholars: ₹100–₹300/month; Hostellers: ₹525–₹700/month",
        "apply_url": "https://scholarships.gov.in",
        "tags": ["Education"],
        "rules": {
            "max_income": 100000,
            "min_age": 10,
            "max_age": 20,
            "categories_allowed": ["OBC"],
            "is_student": True,
        }
    },

    "NSP_Merit_Scholarship": {
        "name": "Central Sector Scheme of Scholarships (Merit-Based)",
        "ministry": "Ministry of Education",
        "description": "Scholarship for meritorious students from non-affluent families to meet day-to-day expenses.",
        "benefit": "₹10,000/year for graduation; ₹20,000/year for professional courses",
        "apply_url": "https://scholarships.gov.in",
        "tags": ["Education"],
        "rules": {
            "max_income": 450000,
            "min_age": 17,
            "max_age": 25,
            "is_student": True,
        }
    },

    "Mahadbt_Scholarship": {
        "name": "MahaDBT Scholarship (Maharashtra)",
        "ministry": "Government of Maharashtra",
        "description": "Maharashtra state scholarship portal covering multiple caste/category scholarships.",
        "benefit": "Varies by scheme: maintenance allowance + tuition reimbursement",
        "apply_url": "https://mahadbt.maharashtra.gov.in",
        "tags": ["Education"],
        "rules": {
            "max_income": 800000,
            "min_age": 15,
            "max_age": 35,
            "states_allowed": ["Maharashtra"],
            "is_student": True,
            "categories_allowed": ["SC", "ST", "OBC", "General"],
        }
    },

    # ─── FINANCE / ENTREPRENEURSHIP ────────────────────────────────────────────

    "Mudra_Shishu": {
        "name": "Pradhan Mantri Mudra Yojana — Shishu",
        "ministry": "Ministry of Finance",
        "description": "Collateral-free micro-loans for small/micro enterprises up to ₹50,000.",
        "benefit": "Loan up to ₹50,000 at low interest rates",
        "apply_url": "https://mudra.org.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 18,
            "max_age": 65,
            "occupation_types": ["Self-Employed", "Artisan", "Business Owner"],
        }
    },

    "Mudra_Kishore": {
        "name": "Pradhan Mantri Mudra Yojana — Kishore",
        "ministry": "Ministry of Finance",
        "description": "Loans between ₹50,001 and ₹5 lakh for growing micro enterprises.",
        "benefit": "Loan ₹50,001–₹5 lakh at concessional rates",
        "apply_url": "https://mudra.org.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 18,
            "max_age": 65,
            "occupation_types": ["Self-Employed", "Artisan", "Business Owner"],
        }
    },

    "StandUp_India": {
        "name": "Stand-Up India Scheme",
        "ministry": "Ministry of Finance",
        "description": "Bank loans between ₹10 lakh and ₹1 crore for SC/ST and women entrepreneurs.",
        "benefit": "Loan ₹10 lakh–₹1 crore for setting up greenfield enterprise",
        "apply_url": "https://www.standupmitra.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 18,
            "categories_allowed": ["SC", "ST", "General"],
            "gender_required": ["Female"] ,
            "gender_exception_categories": ["SC", "ST"],  # SC/ST men also eligible
            "occupation_types": ["Self-Employed", "Business Owner"],
        }
    },

    "PM_SVANidhi": {
        "name": "PM SVANidhi (Street Vendor AtmaNirbhar Nidhi)",
        "ministry": "Ministry of Housing & Urban Affairs",
        "description": "Micro-credit for street vendors to resume their livelihoods post-COVID.",
        "benefit": "Working capital loan of ₹10,000 (extendable to ₹50,000)",
        "apply_url": "https://pmsvanidhi.mohua.gov.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 18,
            "occupation_types": ["Street Vendor", "Self-Employed"],
        }
    },

    # ─── WOMEN & CHILD ─────────────────────────────────────────────────────────

    "PMMVY": {
        "name": "Pradhan Mantri Matru Vandana Yojana",
        "ministry": "Ministry of Women & Child Development",
        "description": "Cash incentive for pregnant women and lactating mothers for their first living child.",
        "benefit": "₹5,000 in three installments for the first child",
        "apply_url": "https://wcd.nic.in",
        "tags": ["Women"],
        "rules": {
            "min_age": 19,
            "max_age": 45,
            "gender_required": ["Female"],
            "max_income": 800000,
        }
    },

    "Sukanya_Samriddhi": {
        "name": "Sukanya Samriddhi Yojana",
        "ministry": "Ministry of Finance",
        "description": "Small savings scheme for the welfare of a girl child.",
        "benefit": "8.2% interest rate; tax exemption; can be opened for girl child below 10 years",
        "apply_url": "https://www.nsiindia.gov.in",
        "tags": ["Women", "Finance"],
        "rules": {
            "max_age": 10,           # Age of the girl child
            "gender_required": ["Female"],
            "applicant_is_parent": True,
        }
    },

    "PM_Ujjwala": {
        "name": "Pradhan Mantri Ujjwala Yojana",
        "ministry": "Ministry of Petroleum & Natural Gas",
        "description": "Free LPG connection to women from BPL households.",
        "benefit": "Free LPG connection + first refill subsidized",
        "apply_url": "https://www.pmujjwalayojana.com",
        "tags": ["Women", "Housing"],
        "rules": {
            "min_age": 18,
            "gender_required": ["Female"],
            "max_income": 150000,
            "categories_allowed": ["SC", "ST", "OBC", "General"],
            "bpl_required": True,
        }
    },

    "Beti_Bachao_Beti_Padhao": {
        "name": "Beti Bachao Beti Padhao",
        "ministry": "Ministry of Women & Child Development",
        "description": "Scheme to address declining child sex ratio and promote welfare of girl child.",
        "benefit": "Education grants and conditional cash transfers for girl child education",
        "apply_url": "https://wcd.nic.in/bbbp-schemes",
        "tags": ["Women", "Education"],
        "rules": {
            "max_age": 18,
            "gender_required": ["Female"],
        }
    },

    # ─── DISABILITY ─────────────────────────────────────────────────────────────

    "NHFDC_Loan": {
        "name": "NHFDC Loan for Persons with Disabilities",
        "ministry": "Ministry of Social Justice & Empowerment",
        "description": "Concessional loans for persons with disabilities for income-generating activities.",
        "benefit": "Loans at 5–8% interest rate for self-employment",
        "apply_url": "https://nhfdc.nic.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 18,
            "max_age": 55,
            "has_disability": True,
            "max_income": 300000,
        }
    },

    "DISHA_Scholarship": {
        "name": "DISHA Scholarship for Students with Disabilities",
        "ministry": "Ministry of Social Justice & Empowerment",
        "description": "Scholarship for students with benchmark disabilities pursuing higher education.",
        "benefit": "₹7,000–₹30,000/year based on level of study",
        "apply_url": "https://scholarships.gov.in",
        "tags": ["Education"],
        "rules": {
            "min_age": 14,
            "max_age": 40,
            "has_disability": True,
            "is_student": True,
        }
    },

    # ─── SENIOR CITIZEN / PENSION ─────────────────────────────────────────────

    "PMVVY_Pension": {
        "name": "Pradhan Mantri Vaya Vandana Yojana",
        "ministry": "Ministry of Finance / LIC",
        "description": "Pension scheme for senior citizens giving guaranteed pension for 10 years.",
        "benefit": "Guaranteed pension of ₹1,000–₹9,250/month",
        "apply_url": "https://licindia.in/pmvvy",
        "tags": ["Finance"],
        "rules": {
            "min_age": 60,
            "max_income": 15000000,
        }
    },

    "IGNOAPS_Pension": {
        "name": "Indira Gandhi National Old Age Pension Scheme",
        "ministry": "Ministry of Rural Development",
        "description": "Monthly pension for elderly BPL persons.",
        "benefit": "Rs.200-Rs.500/month pension",
        "apply_url": "https://nsap.nic.in",
        "tags": ["Finance"],
        "rules": {
            "min_age": 60,
            "max_income": 150000,
            "bpl_preferred": True,
        }
    },

    # --- MAHARASHTRA STATE SCHEMES ------------------------------------------------

    "Ladki_Bahin_Yojana": {
        "name": "Mukhyamantri Majhi Ladki Bahin Yojana",
        "ministry": "Government of Maharashtra - Women & Child Development",
        "description": "Monthly financial assistance of Rs.1,500 to eligible women in Maharashtra via Direct Benefit Transfer (DBT). Covers married, widowed, divorced, abandoned, destitute women and unmarried women in the family.",
        "benefit": "Rs.1,500 per month (Rs.18,000/year) directly to Aadhaar-linked bank account",
        "apply_url": "https://ladakibahin.maharashtra.gov.in",
        "tags": ["Women", "Finance"],
        "rules": {
            "min_age": 21,
            "max_age": 65,
            "max_income": 250000,
            "gender_required": ["Female"],
            "states_allowed": ["Maharashtra"],
            "taxpayer_excluded": True,
            "four_wheeler_excluded": True,
            "govt_employee_excluded": True,
        }
    },
}
