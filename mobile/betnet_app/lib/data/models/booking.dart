class BookingItem {
  BookingItem({
    required this.id,
    required this.propertyId,
    required this.propertyTitle,
    required this.propertySlug,
    required this.status,
    required this.statusDisplay,
    required this.visitDate,
    this.visitTime,
    this.message,
    this.ownerResponse,
    this.renterName,
    this.renterPhone,
  });

  final int id;
  final int propertyId;
  final String propertyTitle;
  final String propertySlug;
  final String status;
  final String statusDisplay;
  final DateTime visitDate;
  final String? visitTime;
  final String? message;
  final String? ownerResponse;
  final String? renterName;
  final String? renterPhone;

  bool get isPending => status == 'PENDING';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get canCancel => status == 'PENDING' || status == 'CONFIRMED';

  factory BookingItem.fromJson(Map<String, dynamic> j) {
    final prop = (j['property_detail'] as Map<String, dynamic>?) ?? const {};
    final renter = (j['renter_detail'] as Map<String, dynamic>?) ?? const {};
    final dateRaw = '${j['visit_date'] ?? ''}';
    return BookingItem(
      id: j['id'] as int,
      propertyId: (j['property'] as int?) ?? (prop['id'] as int? ?? 0),
      propertyTitle: '${prop['title'] ?? 'Property'}',
      propertySlug: '${prop['slug'] ?? ''}',
      status: '${j['status'] ?? ''}',
      statusDisplay: '${j['status_display'] ?? j['status'] ?? ''}',
      visitDate: DateTime.tryParse(dateRaw) ?? DateTime.now(),
      visitTime: j['visit_time'] != null ? '${j['visit_time']}' : null,
      message: j['message'] != null ? '${j['message']}' : null,
      ownerResponse: j['landlord_response'] != null
          ? '${j['landlord_response']}'
          : null,
      renterName:
          '${renter['first_name'] ?? ''} ${renter['last_name'] ?? ''}'.trim(),
      renterPhone: renter['phone_number'] != null ? '${renter['phone_number']}' : null,
    );
  }
}
