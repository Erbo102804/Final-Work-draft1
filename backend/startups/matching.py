"""Rule-based investor ↔ startup matching.

A first step towards the planned AI matching: every published startup gets a score
based on the investor's declared interests. The scoring is transparent so that the
investor can see *why* a startup was recommended.
"""

from accounts.models import InvestorProfile

from .models import Startup

INDUSTRY_WEIGHT = 40
STAGE_WEIGHT = 25
TICKET_WEIGHT = 25
LOCATION_WEIGHT = 10


def score_startup(profile: InvestorProfile, startup: Startup):
    score = 0
    reasons = []

    if profile.industries and startup.industry in profile.industries:
        score += INDUSTRY_WEIGHT
        reasons.append("Отрасль совпадает с вашими интересами")

    if profile.stages and startup.stage in profile.stages:
        score += STAGE_WEIGHT
        reasons.append("Подходящая стадия")

    if startup.funding_needed:
        fits_min = startup.funding_needed >= (profile.ticket_min or 0)
        fits_max = not profile.ticket_max or startup.funding_needed <= profile.ticket_max
        if fits_min and fits_max and (profile.ticket_min or profile.ticket_max):
            score += TICKET_WEIGHT
            reasons.append("Запрос укладывается в ваш чек")

    if profile.location and startup.location and profile.location.lower() in startup.location.lower():
        score += LOCATION_WEIGHT
        reasons.append("Ваш регион")

    return score, reasons


def recommend(profile: InvestorProfile, queryset, limit=10):
    scored = []
    for startup in queryset:
        score, reasons = score_startup(profile, startup)
        if score > 0:
            scored.append((score, startup, reasons))
    scored.sort(key=lambda item: (item[0], item[1].is_featured, item[1].views_count), reverse=True)
    return scored[:limit]
