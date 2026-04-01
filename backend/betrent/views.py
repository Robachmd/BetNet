import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple

import phonenumbers
from phonenumbers import NumberParseException

from django.conf import settings
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Avg, Count, F, Max, Min, Q, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from accounts.models import User
from bookings.models import Booking, HallBooking
from chat.models import Conversation, Message
from payments.models import Payment
from properties.models import (
    Amenities,
    FavoriteProperty,
    HallDetail,
    Location,
    Property,
    PropertyImage,
    PropertyVideo,
)
from reviews.models import Review

MAX_LISTING_PROPERTY_VIDEOS = 5
MAX_PROPERTY_VIDEO_BYTES = 75 * 1024 * 1024


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _attach_property_videos(property_obj, uploaded_files, existing_count: int = 0):
    """Persist uploaded short-form videos (count and size limits)."""
    files = [f for f in uploaded_files if f]
    if not files:
        return
    slot = max(0, MAX_LISTING_PROPERTY_VIDEOS - int(existing_count))
    if slot <= 0:
        raise ValueError(
            f"You can upload at most {MAX_LISTING_PROPERTY_VIDEOS} videos per listing."
        )
    for f in files[:slot]:
        if f.size > MAX_PROPERTY_VIDEO_BYTES:
            raise ValueError(f"Video «{f.name}» is too large (maximum 75 MB).")
        pv = PropertyVideo(property=property_obj, video=f, video_url="")
        pv.full_clean()
        pv.save()

def _normalize_phone(raw: str) -> str:
    """Accept '0911…', '911…', or '+251911…' and return '+251…'."""
    raw = raw.strip().replace(" ", "").replace("-", "")
    if raw.startswith("0"):
        raw = "+251" + raw[1:]
    elif raw.startswith("9") and len(raw) == 9:
        raw = "+251" + raw
    elif not raw.startswith("+"):
        raw = "+251" + raw
    return raw


def _validate_register_phone(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """Validate signup phone: digits only (after stripping spaces/dashes), Ethiopian mobile.

    Returns (normalized_e164, None) on success, or (None, error_message).
    The registration form shows a +251 prefix; users type the remaining digits only.
    """
    raw = (raw or "").strip()
    if not raw:
        return "", None

    cleaned = re.sub(r"[\s\-\(\)]+", "", raw)
    if cleaned.startswith("+251"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("251"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0"):
        cleaned = cleaned[1:]

    if not cleaned.isdigit():
        return None, (
            "Phone number must contain only numbers (no letters). "
            "Use the box after +251, e.g. 91 123 4567."
        )

    if len(cleaned) != 9:
        return None, "Enter exactly 9 digits after +251 (Ethiopian mobile format)."

    if not cleaned.startswith("9"):
        return None, "Ethiopian mobile numbers start with 9 (e.g. 91, 92, 97…)."

    phone_number = "+251" + cleaned
    try:
        parsed = phonenumbers.parse(phone_number, None)
        if not phonenumbers.is_valid_number(parsed):
            return None, "That phone number is not valid. Check the digits and try again."
    except NumberParseException:
        return None, "Invalid phone number format."
    return phone_number, None


def _parse_location_coords_and_maps(request):
    """Map link and/or coordinates; coordinates must be both set or both empty."""
    maps_url = (request.POST.get("maps_url") or "").strip()
    if maps_url and not maps_url.startswith(("http://", "https://")):
        maps_url = "https://" + maps_url
    lat_s = (request.POST.get("latitude") or "").strip()
    lon_s = (request.POST.get("longitude") or "").strip()
    lat = lon = None
    if lat_s or lon_s:
        if not lat_s or not lon_s:
            raise ValueError(
                "Enter both latitude and longitude, or leave both empty and use a map link instead."
            )
        try:
            lat = Decimal(lat_s)
            lon = Decimal(lon_s)
        except InvalidOperation as exc:
            raise ValueError("Invalid latitude or longitude.") from exc
    return lat, lon, maps_url


def _bedroom_filter_value(raw: str) -> str:
    """Map search form values to Property.BedroomCount stored codes."""
    if not raw:
        return ""
    mapping = {
        "0": Property.BedroomCount.STUDIO,
        "1": Property.BedroomCount.ONE,
        "2": Property.BedroomCount.TWO,
        "3": Property.BedroomCount.THREE_PLUS,
        "4": Property.BedroomCount.THREE_PLUS,
        "5": Property.BedroomCount.THREE_PLUS,
        "STUDIO": Property.BedroomCount.STUDIO,
        "ONE": Property.BedroomCount.ONE,
        "TWO": Property.BedroomCount.TWO,
        "THREE_PLUS": Property.BedroomCount.THREE_PLUS,
    }
    return mapping.get(raw.strip(), raw.strip())


def _safe_redirect_path(request, candidate: str, fallback_name: str, **fallback_kwargs):
    """Only allow same-site relative paths for redirects."""
    if candidate and candidate.startswith("/") and not candidate.startswith("//"):
        return redirect(candidate)
    return redirect(fallback_name, **fallback_kwargs)


def _floor_number_from_post(post, property_type: str):
    if property_type not in (
        Property.PropertyType.APARTMENT,
        Property.PropertyType.CONDOMINIUM,
        Property.PropertyType.REAL_ESTATE,
        Property.PropertyType.BUSINESS_SHOP,
    ):
        return None
    raw = (post.get("floor_number") or "").strip()
    if raw == "":
        return None
    try:
        n = int(raw)
    except ValueError as exc:
        raise ValueError("Floor number must be a whole number.") from exc
    if n < 0 or n > 200:
        raise ValueError("Floor number must be between 0 and 200.")
    return n


def _residential_bedrooms_bathrooms_from_post(post):
    """Bedroom/bathroom fields for non–business-shop listings."""
    bedrooms_val = post.get("bedrooms", "")
    if not bedrooms_val:
        raise ValueError("Please select the number of bedrooms.")
    bathrooms_raw = (post.get("bathrooms") or "").strip()
    if bathrooms_raw == "":
        bathrooms_val = 1
    else:
        try:
            bathrooms_val = int(bathrooms_raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("Bathrooms must be a whole number.") from exc
    if bathrooms_val < 0 or bathrooms_val > 10:
        raise ValueError("Bathrooms must be between 0 and 10.")
    return bedrooms_val, bathrooms_val


def _business_shop_class_count_from_post(post):
    """Number of classes (rooms/sections) for BUSINESS_SHOP."""
    raw = (post.get("shop_class_count") or "").strip()
    if not raw:
        raise ValueError("Enter the number of classes for this business shop.")
    try:
        n = int(raw)
    except ValueError as exc:
        raise ValueError("Number of classes must be a whole number.") from exc
    if n < 1 or n > 99:
        raise ValueError("Number of classes must be between 1 and 99.")
    return n


def _property_base_qs():
    """Reusable queryset with common joins – only published & available."""
    return (
        Property.objects
        .select_related("owner", "location", "amenities")
        .prefetch_related("images")
        .filter(is_available=True, is_published=True)
    )


# ---------------------------------------------------------------------------
# 1. Home
# ---------------------------------------------------------------------------

def home(request):
    featured = _property_base_qs().filter(is_featured=True)[:6]
    recent = _property_base_qs().order_by("-created_at")[:8]

    type_counts = (
        Property.objects
        .filter(is_available=True, is_published=True)
        .values("property_type")
        .annotate(count=Count("id"))
        .order_by("property_type")
    )
    property_type_stats = {
        entry["property_type"]: entry["count"] for entry in type_counts
    }

    return render(request, "home.html", {
        "featured_properties": featured,
        "recent_properties": recent,
        "property_type_stats": property_type_stats,
        "property_types": Property.PropertyType.choices,
    })


# ---------------------------------------------------------------------------
# 2. Login
# ---------------------------------------------------------------------------

def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        identifier = (
            request.POST.get("email", "")
            or request.POST.get("phone_number", "")
            or request.POST.get("phone", "")
        ).strip()
        password = request.POST.get("password", "")

        user = None
        if "@" in identifier:
            try:
                u = User.objects.get(email__iexact=identifier)
                user = authenticate(request, username=str(u.phone_number), password=password)
            except User.DoesNotExist:
                pass
        else:
            phone_number = _normalize_phone(identifier)
            user = authenticate(request, username=phone_number, password=password)

        if user is not None:
            login(request, user)
            messages.success(request, f"Welcome back, {user.first_name or 'there'}!")
            next_url = request.GET.get("next") or request.POST.get("next", "")
            return redirect(next_url or "home")

        messages.error(request, "Invalid phone number / email or password.")

    return render(request, "login.html")


# ---------------------------------------------------------------------------
# 3. Register
# ---------------------------------------------------------------------------

def register_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        raw_phone = (
            request.POST.get("phone_number", "")
            or request.POST.get("phone", "")
        ).strip()
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")
        confirm_password = (
            request.POST.get("password_confirm", "")
            or request.POST.get("confirm_password", "")
        )
        first_name = request.POST.get("first_name", "").strip()
        last_name = request.POST.get("last_name", "").strip()
        role = request.POST.get("role", User.Role.RENTER)

        errors = []
        if not email:
            errors.append("Email is required.")

        phone_number = ""
        if raw_phone:
            normalized, phone_err = _validate_register_phone(raw_phone)
            if phone_err:
                errors.append(phone_err)
            else:
                phone_number = normalized or ""
        elif email:
            phone_number = f"+251900{User.objects.count():06d}"

        if not password:
            errors.append("Password is required.")
        if password != confirm_password:
            errors.append("Passwords do not match.")
        if len(password) < 6:
            errors.append("Password must be at least 6 characters.")
        if role not in (User.Role.RENTER, User.Role.LANDLORD):
            errors.append("Invalid role selected.")
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            errors.append("An account with this phone number already exists.")
        if email and User.objects.filter(email__iexact=email).exists():
            errors.append("An account with this email already exists.")

        if errors:
            for err in errors:
                messages.error(request, err)
            return render(request, "register.html", {
                "form_data": request.POST,
            })

        user = User.objects.create_user(
            phone_number=phone_number,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            email=email,
        )
        login(request, user)
        messages.success(request, "Account created successfully! Welcome to BetRent.")
        return redirect("home")

    return render(request, "register.html")


# ---------------------------------------------------------------------------
# 4. Logout
# ---------------------------------------------------------------------------

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("home")


# ---------------------------------------------------------------------------
# 5. Dashboard router
# ---------------------------------------------------------------------------

@login_required
def dashboard_view(request):
    if request.user.role == User.Role.ADMIN:
        return redirect("/admin/")
    if request.user.role == User.Role.LANDLORD:
        return redirect("landlord_dashboard")
    return redirect("renter_dashboard")


# ---------------------------------------------------------------------------
# 6. Renter dashboard
# ---------------------------------------------------------------------------

@login_required
def renter_dashboard(request):
    user = request.user
    today = timezone.now().date()

    upcoming_bookings = (
        Booking.objects
        .filter(
            renter=user,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            visit_date__gte=today,
        )
        .select_related("property", "property__location", "property__owner")
        .prefetch_related("property__images")
        .order_by("visit_date", "visit_time")
    )

    past_bookings = (
        Booking.objects
        .filter(renter=user)
        .exclude(
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            visit_date__gte=today,
        )
        .select_related("property", "property__location")
        .order_by("-visit_date")[:20]
    )

    favorites = (
        FavoriteProperty.objects
        .filter(user=user)
        .select_related("property", "property__location", "property__owner")
        .prefetch_related("property__images")
    )

    return render(request, "renter_dashboard.html", {
        "upcoming_bookings": upcoming_bookings,
        "past_bookings": past_bookings,
        "favorites": favorites,
        "favorites_count": favorites.count(),
        "bookings_count": Booking.objects.filter(renter=user).count(),
    })


# ---------------------------------------------------------------------------
# 7. Landlord dashboard
# ---------------------------------------------------------------------------

@login_required
def landlord_dashboard(request):
    user = request.user
    my_properties = (
        Property.objects
        .filter(owner=user)
        .select_related("location", "amenities")
        .prefetch_related("images")
        .annotate(image_count=Count("images"))
        .order_by("-created_at")
    )

    total_views = my_properties.aggregate(total=Sum("total_views"))["total"] or 0
    property_count = my_properties.count()
    available_count = my_properties.filter(is_available=True).count()
    verified_count = my_properties.filter(is_verified=True).count()

    property_ids = my_properties.values_list("id", flat=True)

    pending_bookings = (
        Booking.objects
        .filter(property_id__in=property_ids, status=Booking.Status.PENDING)
        .select_related("renter", "property")
        .order_by("-created_at")
    )

    recent_bookings = (
        Booking.objects
        .filter(property_id__in=property_ids)
        .select_related("renter", "property")
        .order_by("-created_at")[:10]
    )

    unpublished_count = my_properties.filter(is_published=False).count()
    published_count = my_properties.filter(is_published=True).count()

    listing_payments = (
        Payment.objects.filter(
            payment_type=Payment.PaymentType.LISTING_FEE,
            property__owner=user,
        )
        .select_related("property")
        .order_by("-created_at")[:25]
    )

    return render(request, "landlord_dashboard.html", {
        "my_properties": my_properties,
        "total_views": total_views,
        "pending_bookings": pending_bookings,
        "recent_bookings": recent_bookings,
        "property_count": property_count,
        "available_count": available_count,
        "verified_count": verified_count,
        "unpublished_count": unpublished_count,
        "published_count": published_count,
        "listing_payments": listing_payments,
    })


# ---------------------------------------------------------------------------
# 8. Search / Browse
# ---------------------------------------------------------------------------

def search_view(request):
    qs = _property_base_qs()

    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(location__city__icontains=q)
            | Q(location__sub_city__icontains=q)
            | Q(location__specific_location__icontains=q)
        )

    property_type = request.GET.get("property_type", "")
    if property_type:
        qs = qs.filter(property_type=property_type)

    bedrooms = request.GET.get("bedrooms", "")
    bedroom_code = _bedroom_filter_value(bedrooms)
    if bedroom_code and property_type != Property.PropertyType.BUSINESS_SHOP:
        qs = qs.filter(bedrooms=bedroom_code)

    min_price = request.GET.get("min_price", "")
    if min_price:
        qs = qs.filter(price_monthly__gte=min_price)

    max_price = request.GET.get("max_price", "")
    if max_price:
        qs = qs.filter(price_monthly__lte=max_price)

    city = request.GET.get("city", "")
    if city:
        qs = qs.filter(location__city__iexact=city)

    sub_city = request.GET.get("sub_city", "")
    if sub_city:
        qs = qs.filter(location__sub_city__iexact=sub_city)

    is_verified = request.GET.get("is_verified", "")
    if is_verified in ("1", "true", "on", "yes"):
        qs = qs.filter(is_verified=True)

    sort = request.GET.get("sort", "newest")
    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "price_low": "price_monthly",
        "price_high": "-price_monthly",
        "popular": "-total_views",
        "most_viewed": "-total_views",
    }
    qs = qs.order_by(sort_map.get(sort, "-created_at"))

    paginator = Paginator(qs, 12)
    page = paginator.get_page(request.GET.get("page"))

    cities = (
        Location.objects
        .values_list("city", flat=True)
        .distinct()
        .order_by("city")
    )
    sub_cities = (
        Location.objects
        .values_list("sub_city", flat=True)
        .distinct()
        .order_by("sub_city")
    )

    return render(request, "search.html", {
        "properties": page,
        "query": q,
        "property_types": Property.PropertyType.choices,
        "bedroom_choices": Property.BedroomCount.choices,
        "cities": cities,
        "sub_cities": sub_cities,
        "selected_type": property_type,
        "selected_bedrooms": bedrooms,
        "min_price": min_price,
        "max_price": max_price,
        "selected_city": city,
        "selected_sub_city": sub_city,
        "is_verified_only": is_verified,
        "selected_sort": sort,
        "current_filters": {
            "q": q,
            "property_type": property_type,
            "bedrooms": bedrooms,
            "min_price": min_price,
            "max_price": max_price,
            "city": city,
            "sub_city": sub_city,
            "is_verified": is_verified,
            "sort": sort,
        },
        "total_results": paginator.count,
    })


# ---------------------------------------------------------------------------
# 9. Property detail
# ---------------------------------------------------------------------------

def property_detail(request, slug):
    prop = get_object_or_404(
        Property.objects
        .select_related("owner", "location", "amenities")
        .prefetch_related("images", "videos"),
        slug=slug,
    )

    is_owner = request.user.is_authenticated and (
        prop.owner == request.user or request.user.role == User.Role.ADMIN
    )
    if not prop.is_published and not is_owner:
        messages.warning(request, "This listing is not yet published.")
        return redirect("home")

    Property.objects.filter(pk=prop.pk).update(total_views=F("total_views") + 1)

    reviews = (
        Review.objects
        .filter(property=prop, is_approved=True)
        .select_related("reviewer")
        .order_by("-created_at")
    )
    review_stats = reviews.aggregate(
        avg_rating=Avg("rating"),
        total_reviews=Count("id"),
    )

    similar = (
        _property_base_qs()
        .filter(
            property_type=prop.property_type,
            location__city=prop.location.city,
        )
        .exclude(pk=prop.pk)[:4]
    )

    price_insight = (
        Property.objects
        .filter(
            property_type=prop.property_type,
            location__sub_city=prop.location.sub_city,
            is_available=True,
            is_published=True,
        )
        .aggregate(
            avg_price=Avg("price_monthly"),
            min_price=Min("price_monthly"),
            max_price=Max("price_monthly"),
        )
    )

    is_favorited = False
    has_booked = False
    if request.user.is_authenticated:
        is_favorited = FavoriteProperty.objects.filter(
            user=request.user, property=prop
        ).exists()
        has_booked = Booking.objects.filter(
            renter=request.user,
            property=prop,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        ).exists()

    hall_detail = None
    if prop.is_hall:
        hall_detail = getattr(prop, "hall_detail", None)

    property_videos = list(prop.videos.all())

    return render(request, "property_detail.html", {
        "property": prop,
        "images": prop.images.all(),
        "property_videos": property_videos,
        "reviews": reviews,
        "review_stats": review_stats,
        "similar_properties": similar,
        "price_insight": price_insight,
        "is_favorited": is_favorited,
        "has_booked": has_booked,
        "hall_detail": hall_detail,
        "today": timezone.now().date(),
    })


# ---------------------------------------------------------------------------
# 10. Add property (landlord)
# ---------------------------------------------------------------------------

@login_required
def add_property(request):
    if request.user.role not in (User.Role.LANDLORD, User.Role.ADMIN):
        messages.error(request, "Only landlords can list properties.")
        return redirect("dashboard")

    if request.method == "POST":
        try:
            lat, lon, maps_url = _parse_location_coords_and_maps(request)
            ptype = request.POST.get("property_type", "")
            floor_n = _floor_number_from_post(request.POST, ptype)

            location = Location.objects.create(
                city=request.POST.get("city", ""),
                sub_city=request.POST.get("sub_city", ""),
                woreda=request.POST.get("woreda", ""),
                kebele=request.POST.get("kebele", ""),
                specific_location=request.POST.get("specific_location", ""),
                maps_url=maps_url,
                latitude=lat,
                longitude=lon,
            )

            amenities = Amenities.objects.create(
                water_availability=request.POST.get(
                    "water_availability", Amenities.WaterAvailability.SOMETIMES
                ),
                electricity_stability=request.POST.get(
                    "electricity_stability", Amenities.ElectricityStability.MODERATE
                ),
                has_parking="has_parking" in request.POST,
                has_wifi="has_wifi" in request.POST,
                has_security="has_security" in request.POST,
                has_generator="has_generator" in request.POST,
                is_furnished="is_furnished" in request.POST,
                has_elevator="has_elevator" in request.POST,
                has_balcony="has_balcony" in request.POST,
                has_garden="has_garden" in request.POST,
                has_cctv="has_cctv" in request.POST,
                pets_allowed="pets_allowed" in request.POST,
            )

            area_raw = request.POST.get("area_sqm") or request.POST.get("area") or None

            if ptype == Property.PropertyType.BUSINESS_SHOP:
                shop_cc = _business_shop_class_count_from_post(request.POST)
                bedrooms_val = ""
                bathrooms_val = 0
            else:
                bedrooms_val, bathrooms_val = _residential_bedrooms_bathrooms_from_post(
                    request.POST
                )
                shop_cc = None

            prop = Property.objects.create(
                owner=request.user,
                title=request.POST.get("title", ""),
                description=request.POST.get("description", ""),
                property_type=ptype,
                bedrooms=bedrooms_val,
                bathrooms=bathrooms_val,
                shop_class_count=shop_cc,
                floor_number=floor_n,
                area_sqm=area_raw or None,
                price_monthly=request.POST.get("price_monthly", 0),
                price_currency=request.POST.get("price_currency", "ETB"),
                location=location,
                amenities=amenities,
            )

            if prop.is_hall:
                HallDetail.objects.create(
                    property=prop,
                    capacity=int(request.POST.get("capacity", 0)),
                    price_per_hour=request.POST.get("price_per_hour") or None,
                    price_per_day=request.POST.get("price_per_day") or None,
                    has_sound_system="has_sound_system" in request.POST,
                    has_stage="has_stage" in request.POST,
                    decoration_allowed="decoration_allowed" in request.POST,
                    catering_available="catering_available" in request.POST,
                    is_indoor="is_indoor" in request.POST,
                    hall_type=request.POST.get("hall_type", ""),
                )

            images = request.FILES.getlist("images")
            for i, img in enumerate(images):
                PropertyImage.objects.create(
                    property=prop,
                    image=img,
                    is_primary=(i == 0),
                )

            video_files = [f for f in request.FILES.getlist("videos") if f]
            _attach_property_videos(prop, video_files)
            msg = "Your listing is saved! Complete payment to publish it."
            if video_files:
                msg += f" {len(video_files)} short video(s) uploaded."
            messages.info(request, msg)
            return redirect("publish_payment", slug=prop.slug)

        except (ValueError, TypeError, ValidationError) as exc:
            messages.error(request, f"Please correct the errors: {exc}")
            return render(request, "add_property.html", {
                "form_data": request.POST,
                "property_types": Property.PropertyType.choices,
                "bedroom_choices": Property.BedroomCount.choices,
                "hall_types": HallDetail.HallType.choices,
                "water_choices": Amenities.WaterAvailability.choices,
                "electricity_choices": Amenities.ElectricityStability.choices,
                "listing_fee_etb": settings.LISTING_FEE_ETB,
            })

    return render(request, "add_property.html", {
        "property_types": Property.PropertyType.choices,
        "bedroom_choices": Property.BedroomCount.choices,
        "hall_types": HallDetail.HallType.choices,
        "water_choices": Amenities.WaterAvailability.choices,
        "electricity_choices": Amenities.ElectricityStability.choices,
        "listing_fee_etb": settings.LISTING_FEE_ETB,
    })


# ---------------------------------------------------------------------------
# 11. Edit property (owner only)
# ---------------------------------------------------------------------------

@login_required
def edit_property(request, slug):
    prop = get_object_or_404(
        Property.objects.select_related("location", "amenities", "hall_detail")
        .prefetch_related("images", "videos"),
        slug=slug,
    )

    if prop.owner != request.user and request.user.role != User.Role.ADMIN:
        messages.error(request, "You do not have permission to edit this property.")
        return redirect("property_detail", slug=slug)

    if request.method == "POST":
        try:
            lat, lon, maps_url = _parse_location_coords_and_maps(request)
            ptype = request.POST.get("property_type", prop.property_type)
            floor_n = _floor_number_from_post(request.POST, ptype)

            loc = prop.location
            loc.city = request.POST.get("city", loc.city)
            loc.sub_city = request.POST.get("sub_city", loc.sub_city)
            loc.woreda = request.POST.get("woreda", loc.woreda)
            loc.kebele = request.POST.get("kebele", loc.kebele)
            loc.specific_location = request.POST.get(
                "specific_location", loc.specific_location
            )
            loc.maps_url = maps_url
            loc.latitude = lat
            loc.longitude = lon
            loc.save()

            am = prop.amenities
            am.water_availability = request.POST.get(
                "water_availability", am.water_availability
            )
            am.electricity_stability = request.POST.get(
                "electricity_stability", am.electricity_stability
            )
            am.has_parking = "has_parking" in request.POST
            am.has_wifi = "has_wifi" in request.POST
            am.has_security = "has_security" in request.POST
            am.has_generator = "has_generator" in request.POST
            am.is_furnished = "is_furnished" in request.POST
            am.has_elevator = "has_elevator" in request.POST
            am.has_balcony = "has_balcony" in request.POST
            am.has_garden = "has_garden" in request.POST
            am.has_cctv = "has_cctv" in request.POST
            am.pets_allowed = "pets_allowed" in request.POST
            am.save()

            prop.title = request.POST.get("title", prop.title)
            prop.description = request.POST.get("description", prop.description)
            prop.property_type = request.POST.get("property_type", prop.property_type)
            if prop.property_type == Property.PropertyType.BUSINESS_SHOP:
                prop.shop_class_count = _business_shop_class_count_from_post(
                    request.POST
                )
                prop.bedrooms = ""
                prop.bathrooms = 0
            else:
                bdr, bth = _residential_bedrooms_bathrooms_from_post(request.POST)
                prop.bedrooms = bdr
                prop.bathrooms = bth
                prop.shop_class_count = None
            prop.floor_number = floor_n
            ar = (request.POST.get("area_sqm") or request.POST.get("area") or "").strip()
            prop.area_sqm = None if ar == "" else ar
            prop.price_monthly = request.POST.get("price_monthly", prop.price_monthly)
            prop.price_currency = request.POST.get(
                "price_currency", prop.price_currency
            )
            prop.is_available = "is_available" in request.POST
            prop.save()

            if prop.is_hall:
                hall, _created = HallDetail.objects.get_or_create(property=prop)
                hall.capacity = int(request.POST.get("capacity", hall.capacity or 0))
                hall.price_per_hour = request.POST.get("price_per_hour") or hall.price_per_hour
                hall.price_per_day = request.POST.get("price_per_day") or hall.price_per_day
                hall.has_sound_system = "has_sound_system" in request.POST
                hall.has_stage = "has_stage" in request.POST
                hall.decoration_allowed = "decoration_allowed" in request.POST
                hall.catering_available = "catering_available" in request.POST
                hall.is_indoor = "is_indoor" in request.POST
                hall.hall_type = request.POST.get("hall_type", hall.hall_type or "")
                hall.save()

            delete_ids = request.POST.getlist("delete_images")
            if delete_ids:
                PropertyImage.objects.filter(
                    id__in=delete_ids, property=prop
                ).delete()

            new_images = request.FILES.getlist("images")
            for img in new_images:
                PropertyImage.objects.create(property=prop, image=img)

            delete_video_ids = request.POST.getlist("delete_videos")
            if delete_video_ids:
                PropertyVideo.objects.filter(
                    id__in=delete_video_ids,
                    property=prop,
                ).delete()

            new_video_files = [f for f in request.FILES.getlist("videos") if f]
            _attach_property_videos(
                prop,
                new_video_files,
                existing_count=prop.videos.count(),
            )
            msg = "Property updated successfully!"
            if new_video_files:
                msg += f" {len(new_video_files)} new video(s) added."
            messages.success(request, msg)
            return redirect("property_detail", slug=prop.slug)

        except (ValueError, TypeError, ValidationError) as exc:
            messages.error(request, f"Please correct the errors: {exc}")

    try:
        hall_detail = prop.hall_detail
    except ObjectDoesNotExist:
        hall_detail = None

    return render(request, "edit_property.html", {
        "property": prop,
        "hall_detail": hall_detail,
        "property_types": Property.PropertyType.choices,
        "bedroom_choices": Property.BedroomCount.choices,
        "hall_types": HallDetail.HallType.choices,
        "water_choices": Amenities.WaterAvailability.choices,
        "electricity_choices": Amenities.ElectricityStability.choices,
    })


# ---------------------------------------------------------------------------
# 12. Toggle favorite
# ---------------------------------------------------------------------------

@login_required
@require_POST
def toggle_favorite(request, property_id):
    prop = get_object_or_404(Property, pk=property_id)
    next_path = request.POST.get("next", "").strip()
    fav, created = FavoriteProperty.objects.get_or_create(
        user=request.user, property=prop
    )
    if not created:
        fav.delete()
        messages.info(request, "Removed from your favorites.")
    else:
        messages.success(request, "Saved to favorites.")
    return _safe_redirect_path(request, next_path, "property_detail", slug=prop.slug)


# ---------------------------------------------------------------------------
# 13. Book a visit
# ---------------------------------------------------------------------------

@login_required
@require_POST
def book_visit(request, slug):
    prop = get_object_or_404(Property, slug=slug)

    visit_date_str = request.POST.get("visit_date", "")
    visit_time_str = request.POST.get("visit_time", "")
    booking_type = request.POST.get("booking_type", Booking.BookingType.VISIT)
    message_text = request.POST.get("message", "")

    if not visit_date_str or not visit_time_str:
        messages.error(request, "Visit date and time are required.")
        return redirect("property_detail", slug=slug)

    try:
        visit_date = date.fromisoformat(visit_date_str)
    except ValueError:
        messages.error(request, "Invalid date format.")
        return redirect("property_detail", slug=slug)

    visit_time_str = visit_time_str.strip()
    try:
        visit_time = datetime.strptime(visit_time_str, "%H:%M").time()
    except ValueError:
        try:
            visit_time = datetime.strptime(visit_time_str, "%H:%M:%S").time()
        except ValueError:
            messages.error(request, "Invalid time format. Use hours and minutes (e.g. 14:30).")
            return redirect("property_detail", slug=slug)

    if visit_date < timezone.now().date():
        messages.error(request, "Visit date cannot be in the past.")
        return redirect("property_detail", slug=slug)

    if prop.owner == request.user:
        messages.error(request, "You cannot book your own property.")
        return redirect("property_detail", slug=slug)

    existing = Booking.objects.filter(
        renter=request.user,
        property=prop,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
    ).exists()
    if existing:
        messages.warning(request, "You already have an active booking for this property.")
        return redirect("property_detail", slug=slug)

    Booking.objects.create(
        property=prop,
        renter=request.user,
        booking_type=booking_type,
        visit_date=visit_date,
        visit_time=visit_time,
        message=message_text,
    )
    messages.success(request, "Your visit has been booked! The landlord will confirm soon.")
    return redirect("property_detail", slug=slug)


# ---------------------------------------------------------------------------
# 14. Manage booking (confirm / reject / cancel)
# ---------------------------------------------------------------------------

@login_required
@require_POST
def manage_booking(request, booking_id):
    booking = get_object_or_404(
        Booking.objects.select_related("property", "property__owner", "renter"),
        pk=booking_id,
    )

    action = request.POST.get("action", "").upper()
    # Templates use CONFIRMED / REJECTED; accept both spellings
    if action == "CONFIRMED":
        action = "CONFIRM"
    elif action == "REJECTED":
        action = "REJECT"
    elif action == "CANCELLED":
        action = "CANCEL"

    is_landlord = booking.property.owner == request.user
    is_renter = booking.renter == request.user

    status_map = {
        "CONFIRM": (Booking.Status.CONFIRMED, is_landlord),
        "REJECT": (Booking.Status.REJECTED, is_landlord),
        "CANCEL": (Booking.Status.CANCELLED, is_renter or is_landlord),
        "COMPLETE": (Booking.Status.COMPLETED, is_landlord),
    }

    if action not in status_map:
        messages.error(request, "Invalid action.")
        return redirect("dashboard")

    new_status, has_permission = status_map[action]

    if not has_permission:
        messages.error(request, "You do not have permission to perform this action.")
        return redirect("dashboard")

    if not booking.can_transition_to(new_status):
        messages.error(
            request,
            f"Cannot {action.lower()} a booking that is currently {booking.get_status_display()}.",
        )
        return redirect("dashboard")

    booking.status = new_status
    response_text = request.POST.get("response", "")
    if response_text:
        booking.landlord_response = response_text
    booking.save(update_fields=["status", "landlord_response", "updated_at"])

    messages.success(request, f"Booking has been {new_status.lower()}.")
    return redirect("dashboard")


# ---------------------------------------------------------------------------
# 15. Halls listing
# ---------------------------------------------------------------------------

def halls_view(request):
    qs = (
        _property_base_qs()
        .filter(property_type=Property.PropertyType.HALL_RENTAL)
        .select_related("hall_detail")
    )

    hall_type = request.GET.get("hall_type", "")
    if hall_type:
        qs = qs.filter(hall_detail__hall_type=hall_type)

    min_capacity = request.GET.get("min_capacity", "")
    if min_capacity:
        qs = qs.filter(hall_detail__capacity__gte=min_capacity)

    max_capacity = request.GET.get("max_capacity", "")
    if max_capacity:
        qs = qs.filter(hall_detail__capacity__lte=max_capacity)

    city = request.GET.get("city", "")
    if city:
        qs = qs.filter(location__city__iexact=city)

    sort = request.GET.get("sort", "newest")
    sort_map = {
        "newest": "-created_at",
        "price_low": "price_monthly",
        "price_high": "-price_monthly",
        "capacity": "-hall_detail__capacity",
    }
    qs = qs.order_by(sort_map.get(sort, "-created_at"))

    paginator = Paginator(qs, 12)
    page = paginator.get_page(request.GET.get("page"))

    return render(request, "halls.html", {
        "halls": page,
        "hall_types": HallDetail.HallType.choices,
        "selected_hall_type": hall_type,
        "selected_city": city,
        "min_capacity": min_capacity,
        "max_capacity": max_capacity,
        "current_filters": {
            "hall_type": hall_type,
            "min_capacity": min_capacity,
            "max_capacity": max_capacity,
            "city": city,
            "sort": sort,
        },
        "total_results": paginator.count,
    })


# ---------------------------------------------------------------------------
# 16. Messages — renter ↔ landlord (server-rendered thread)
# ---------------------------------------------------------------------------

@login_required
def messages_inbox(request):
    convs = (
        Conversation.objects.filter(participants=request.user, is_active=True)
        .select_related("property")
        .prefetch_related("participants")
        .order_by("-updated_at")
    )
    return render(request, "messages_inbox.html", {"conversations": convs})


@login_required
def start_property_message(request, slug):
    prop = get_object_or_404(
        Property.objects.select_related("owner"),
        slug=slug,
    )
    is_admin = request.user.role == User.Role.ADMIN
    is_owner = prop.owner == request.user
    if not prop.is_published and not is_owner and not is_admin:
        messages.warning(request, "This listing is not available.")
        return redirect("home")
    if is_owner:
        messages.info(request, "Renters will message you here. Open Messages in the menu to reply.")
        return redirect("messages_inbox")

    landlord = prop.owner
    conv = (
        Conversation.objects.filter(property=prop, is_active=True)
        .filter(participants=request.user)
        .filter(participants=landlord)
        .first()
    )
    if not conv:
        conv = Conversation.objects.create(property=prop)
        conv.participants.add(request.user, landlord)
    return redirect("conversation_thread", conversation_id=conv.pk)


@login_required
def conversation_thread(request, conversation_id):
    conv = get_object_or_404(
        Conversation.objects.filter(participants=request.user, is_active=True)
        .select_related("property", "property__owner"),
        pk=conversation_id,
    )
    if request.method == "POST":
        content = (request.POST.get("message") or "").strip()
        if content:
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                content=content,
                message_type=Message.MessageType.TEXT,
            )
            conv.save(update_fields=["updated_at"])
            messages.success(request, "Message sent.")
        else:
            messages.error(request, "Please enter a message.")
        return redirect("conversation_thread", conversation_id=conv.pk)

    msgs = conv.messages.select_related("sender").order_by("created_at")
    other = conv.get_other_participant(request.user)
    return render(request, "conversation_thread.html", {
        "conversation": conv,
        "messages_list": msgs,
        "other_user": other,
    })


# ---------------------------------------------------------------------------
# 17. Profile view / edit
# ---------------------------------------------------------------------------

@login_required
def profile_view(request):
    user = request.user

    if request.method == "POST":
        user.first_name = request.POST.get("first_name", user.first_name)
        user.last_name = request.POST.get("last_name", user.last_name)
        user.email = request.POST.get("email", user.email)
        user.city = request.POST.get("city", user.city)
        user.sub_city = request.POST.get("sub_city", user.sub_city)
        user.bio = request.POST.get("bio", user.bio)
        user.preferred_language = request.POST.get(
            "preferred_language", user.preferred_language
        )

        if "profile_image" in request.FILES:
            user.profile_image = request.FILES["profile_image"]

        user.save()
        messages.success(request, "Profile updated successfully!")
        return redirect("profile")

    reviews_received = (
        Review.objects
        .filter(reviewed_user=user, is_approved=True)
        .select_related("reviewer")
        .order_by("-created_at")[:10]
    )
    avg_rating = reviews_received.aggregate(avg=Avg("rating"))["avg"]

    return render(request, "profile.html", {
        "profile_user": user,
        "reviews_received": reviews_received,
        "avg_rating": avg_rating,
        "language_choices": User.Language.choices,
    })


# ---------------------------------------------------------------------------
# 17. Listing Payment – gate before publishing
# ---------------------------------------------------------------------------

@login_required
def publish_payment(request, slug):
    prop = get_object_or_404(Property, slug=slug, owner=request.user)

    if prop.is_published:
        messages.info(request, "This listing is already published.")
        return redirect("property_detail", slug=slug)

    return render(request, "publish_payment.html", {
        "property": prop,
        "listing_fee": settings.LISTING_FEE_ETB,
    })


@login_required
@require_POST
def process_publish_payment(request, slug):
    prop = get_object_or_404(Property, slug=slug, owner=request.user)

    if prop.is_published:
        messages.info(request, "This listing is already published.")
        return redirect("property_detail", slug=slug)

    payment_method = request.POST.get("payment_method", "CHAPA")

    payment = Payment.objects.create(
        user=request.user,
        payment_type=Payment.PaymentType.LISTING_FEE,
        amount=settings.LISTING_FEE_ETB,
        currency="ETB",
        payment_method=payment_method,
        property=prop,
        description=f"Listing fee for: {prop.title}",
    )

    payment.mark_completed({
        "simulated": True,
        "note": "Demo checkout — in production verify via Chapa/Telebirr/Stripe webhook before marking completed.",
        "recorded_status": "COMPLETED",
        "recorded_at": timezone.now().isoformat(),
    })

    prop.is_published = True
    prop.save(update_fields=["is_published", "updated_at"])

    messages.success(request, "Payment successful! Your listing is now live.")
    return redirect("property_detail", slug=prop.slug)
