class ListingPackageItem {
  ListingPackageItem({
    required this.id,
    required this.name,
    required this.code,
    required this.listingQuota,
    required this.price,
    required this.currency,
    required this.validityDays,
    required this.sortOrder,
    this.tagline,
    this.badgeLabel,
    this.compareAtPrice,
    this.savingsPercent,
    this.pricePerListing,
  });

  final int id;
  final String name;
  final String code;
  final int listingQuota;
  final String price;
  final String currency;
  final int validityDays;
  final int sortOrder;
  final String? tagline;
  final String? badgeLabel;
  final String? compareAtPrice;
  final int? savingsPercent;
  final String? pricePerListing;

  factory ListingPackageItem.fromJson(Map<String, dynamic> j) {
    return ListingPackageItem(
      id: j['id'] as int,
      name: '${j['name'] ?? ''}',
      code: '${j['code'] ?? ''}',
      listingQuota: (j['listing_quota'] as num?)?.toInt() ?? 0,
      price: '${j['price'] ?? '0'}',
      currency: '${j['currency'] ?? 'ETB'}',
      validityDays: (j['validity_days'] as num?)?.toInt() ?? 0,
      sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      tagline: j['tagline'] != null ? '${j['tagline']}' : null,
      badgeLabel: j['badge_label'] != null ? '${j['badge_label']}' : null,
      compareAtPrice: j['compare_at_price'] != null ? '${j['compare_at_price']}' : null,
      savingsPercent: (j['savings_percent'] as num?)?.toInt(),
      pricePerListing: j['price_per_listing'] != null ? '${j['price_per_listing']}' : null,
    );
  }
}

class ListingPackagePurchaseItem {
  ListingPackagePurchaseItem({
    required this.id,
    required this.status,
    required this.statusDisplay,
    required this.slotsTotal,
    required this.slotsUsed,
    required this.createdAt,
    this.packageName,
    this.expiresAt,
  });

  final int id;
  final String status;
  final String statusDisplay;
  final int slotsTotal;
  final int slotsUsed;
  final DateTime createdAt;
  final String? packageName;
  final DateTime? expiresAt;

  int get slotsRemaining => slotsTotal - slotsUsed;

  factory ListingPackagePurchaseItem.fromJson(Map<String, dynamic> j) {
    final pkg = j['package'] as Map<String, dynamic>?;
    return ListingPackagePurchaseItem(
      id: j['id'] as int,
      status: '${j['status'] ?? ''}',
      statusDisplay: '${j['status_display'] ?? j['status'] ?? ''}',
      slotsTotal: (j['slots_total'] as num?)?.toInt() ?? 0,
      slotsUsed: (j['slots_used'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}') ?? DateTime.now(),
      packageName: pkg?['name'] != null ? '${pkg!['name']}' : null,
      expiresAt: j['expires_at'] != null
          ? DateTime.tryParse('${j['expires_at']}')
          : null,
    );
  }
}
