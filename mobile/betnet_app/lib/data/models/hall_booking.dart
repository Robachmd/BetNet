class HallBookingItem {
  HallBookingItem({
    required this.id,
    required this.propertyId,
    required this.propertyTitle,
    required this.status,
    required this.statusDisplay,
    required this.eventDate,
    this.eventEndDate,
    this.eventType,
    this.totalPrice,
  });

  final int id;
  final int propertyId;
  final String propertyTitle;
  final String status;
  final String statusDisplay;
  final DateTime eventDate;
  final DateTime? eventEndDate;
  final String? eventType;
  final String? totalPrice;

  factory HallBookingItem.fromJson(Map<String, dynamic> j) {
    final prop = (j['property_detail'] as Map<String, dynamic>?) ?? const {};
    return HallBookingItem(
      id: j['id'] as int,
      propertyId: (j['property'] as int?) ?? (prop['id'] as int? ?? 0),
      propertyTitle: '${prop['title'] ?? 'Hall'}',
      status: '${j['status'] ?? ''}',
      statusDisplay: '${j['status_display'] ?? j['status'] ?? ''}',
      eventDate: DateTime.tryParse('${j['event_date'] ?? ''}') ?? DateTime.now(),
      eventEndDate: j['event_end_date'] != null
          ? DateTime.tryParse('${j['event_end_date']}')
          : null,
      eventType: j['event_type'] != null ? '${j['event_type']}' : null,
      totalPrice: j['total_price'] != null ? '${j['total_price']}' : null,
    );
  }
}
