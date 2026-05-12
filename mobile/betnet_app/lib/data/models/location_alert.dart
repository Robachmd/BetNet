class LocationAlertItem {
  LocationAlertItem({
    required this.id,
    required this.city,
    required this.subCity,
    required this.label,
    required this.propertyTypes,
    required this.onlyAvailableListings,
    required this.radiusKm,
    required this.isActive,
    this.latitude,
    this.longitude,
  });

  final int id;
  final String city;
  final String subCity;
  final String label;
  /// Django `Property.property_type` values, e.g. APARTMENT, CONDOMINIUM.
  final List<String> propertyTypes;
  /// When false, alerts may still fire for unavailable/booked-out listings.
  final bool onlyAvailableListings;
  final int radiusKm;
  final bool isActive;
  final double? latitude;
  final double? longitude;

  factory LocationAlertItem.fromJson(Map<String, dynamic> j) {
    return LocationAlertItem(
      id: j['id'] as int,
      city: '${j['city'] ?? ''}',
      subCity: '${j['sub_city'] ?? ''}',
      label: '${j['label'] ?? ''}',
      propertyTypes: _parsePropertyTypes(j),
      onlyAvailableListings: j['only_available_listings'] as bool? ?? true,
      radiusKm: (j['radius_km'] as num?)?.toInt() ?? 5,
      isActive: j['is_active'] as bool? ?? true,
      latitude: (j['latitude'] as num?)?.toDouble(),
      longitude: (j['longitude'] as num?)?.toDouble(),
    );
  }
}

List<String> _parsePropertyTypes(Map<String, dynamic> j) {
  final raw = j['property_types'];
  if (raw is List) {
    return raw.map((e) => '$e').where((s) => s.isNotEmpty).toList();
  }
  final legacy = j['property_type'];
  if (legacy != null && '$legacy'.trim().isNotEmpty) {
    return ['$legacy'.trim().toUpperCase()];
  }
  return [];
}
