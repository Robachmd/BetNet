class LocationAlertItem {
  LocationAlertItem({
    required this.id,
    required this.city,
    required this.subCity,
    required this.label,
    required this.radiusKm,
    required this.isActive,
    this.latitude,
    this.longitude,
  });

  final int id;
  final String city;
  final String subCity;
  final String label;
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
      radiusKm: (j['radius_km'] as num?)?.toInt() ?? 5,
      isActive: j['is_active'] as bool? ?? true,
      latitude: (j['latitude'] as num?)?.toDouble(),
      longitude: (j['longitude'] as num?)?.toDouble(),
    );
  }
}
