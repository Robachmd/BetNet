/// Listing type values (Django `Property.ListingType`).
abstract final class ListingTypeValues {
  static const rent = 'rent';
  static const sale = 'sale';
  static const shortTerm = 'short_term';
}

/// Property type dropdown: API value and user-facing label (aligned with web).
const List<(String, String)> kAddPropertyTypeChoices = [
  ('APARTMENT', 'Apartment'),
  ('VILLA', 'Villa'),
  ('CONDOMINIUM', 'Condominium'),
  ('SERVICE_HOUSE', 'Service house'),
  ('REAL_ESTATE', 'Office / commercial space'),
  ('BUSINESS_SHOP', 'Business shop'),
  ('HALL_RENTAL', 'Hall rental'),
];

bool isHallPropertyType(String? apiType) =>
    apiType != null && apiType.toUpperCase() == 'HALL_RENTAL';

/// Default amenities payload for new listings (user can override in UI).
Map<String, dynamic> defaultAmenitiesMap() => {
      'water_availability': 'SOMETIMES',
      'electricity_stability': 'MODERATE',
      'has_parking': false,
      'has_wifi': false,
      'has_security': false,
      'has_generator': false,
      'is_furnished': false,
      'has_elevator': false,
      'has_balcony': false,
      'has_garden': false,
      'has_cctv': false,
      'pets_allowed': false,
    };

const List<(String, String)> kWaterChoices = [
  ('ALWAYS', 'Always available'),
  ('SOMETIMES', 'Sometimes available'),
  ('RARELY', 'Rarely available'),
];

const List<(String, String)> kElectricityChoices = [
  ('STABLE', 'Stable'),
  ('MODERATE', 'Moderate'),
  ('UNSTABLE', 'Unstable'),
];

const List<(String, String)> kHallTypeChoices = [
  ('WEDDING', 'Wedding hall'),
  ('MEETING', 'Meeting room'),
  ('CONFERENCE', 'Conference hall'),
  ('PARTY', 'Party venue'),
  ('OUTDOOR_GARDEN', 'Outdoor garden'),
];

/// Halls: backend still expects `price_monthly`; use day rate or hourly×8 fallback.
double hallPriceMonthlyPlaceholder({
  double? pricePerHour,
  double? pricePerDay,
}) {
  if (pricePerDay != null && pricePerDay > 0) return pricePerDay;
  if (pricePerHour != null && pricePerHour > 0) return pricePerHour * 8;
  return 1;
}
