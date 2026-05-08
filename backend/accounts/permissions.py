from __future__ import annotations

from typing import Iterable


def _normalize_role(role: str | None) -> str:
    return (role or "").strip().upper()


def user_roles(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()

    roles: set[str] = set()

    # Preferred: explicit multi-role membership.
    raw = getattr(user, "roles", None)
    if isinstance(raw, list):
        for r in raw:
            v = _normalize_role(r if isinstance(r, str) else "")
            if v:
                roles.add(v)

    # Backward-compat: legacy single role + eligibility flags.
    legacy_role = _normalize_role(getattr(user, "role", None))
    if legacy_role:
        roles.add(legacy_role)

    if bool(getattr(user, "landlord_eligible", False)):
        roles.add("LANDLORD")

    if bool(getattr(user, "is_staff", False)) or bool(getattr(user, "is_superuser", False)):
        roles.add("ADMIN")

    return roles


def has_role(user, role: str) -> bool:
    return _normalize_role(role) in user_roles(user)


def can_access_owner_workspace(user) -> bool:
    roles = user_roles(user)
    return "LANDLORD" in roles or "ADMIN" in roles

