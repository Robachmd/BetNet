import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/property.dart';
import '../services/betnet_api.dart';

enum PropertyMarketSegment { buy, rent, commercial, hall }

class PropertyMarketState {
  const PropertyMarketState({
    this.segment = PropertyMarketSegment.rent,
    this.categoryKey,
    this.ordering = '-created_at',
  });

  final PropertyMarketSegment segment;
  /// APARTMENT, VILLA, CONDOMINIUM, SERVICE_HOUSE, STUDIO, or null (all).
  final String? categoryKey;
  final String ordering;

  PropertyMarketState copyWith({
    PropertyMarketSegment? segment,
    String? categoryKey,
    bool clearCategory = false,
    String? ordering,
  }) {
    return PropertyMarketState(
      segment: segment ?? this.segment,
      categoryKey: clearCategory ? null : (categoryKey ?? this.categoryKey),
      ordering: ordering ?? this.ordering,
    );
  }
}

final propertyMarketProvider =
    StateProvider<PropertyMarketState>((ref) => const PropertyMarketState());

/// Listings for the Property tab (marketplace): switches list vs hall API by segment.
final propertyMarketListingsProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final m = ref.watch(propertyMarketProvider);
  final api = ref.watch(betNetApiProvider);

  if (m.segment == PropertyMarketSegment.hall) {
    String? hallOrdering;
    switch (m.ordering) {
      case 'price_monthly':
        hallOrdering = 'price_per_hour';
        break;
      case '-price_monthly':
        hallOrdering = '-price_per_hour';
        break;
      default:
        hallOrdering = m.ordering;
    }
    return api.fetchHallRentals(ordering: hallOrdering);
  }

  String? listingType;
  switch (m.segment) {
    case PropertyMarketSegment.buy:
      listingType = 'sale';
      break;
    case PropertyMarketSegment.rent:
      listingType = 'rent';
      break;
    case PropertyMarketSegment.commercial:
      listingType = null;
      break;
    case PropertyMarketSegment.hall:
      break;
  }

  if (m.segment == PropertyMarketSegment.commercial) {
    final shops = await api.fetchProperties(
      listingType: listingType,
      propertyType: 'BUSINESS_SHOP',
      ordering: m.ordering,
    );
    final realEstate = await api.fetchProperties(
      listingType: listingType,
      propertyType: 'REAL_ESTATE',
      ordering: m.ordering,
    );
    final byId = <int, PropertySummary>{};
    for (final p in [...shops, ...realEstate]) {
      byId[p.id] = p;
    }
    var merged = byId.values.toList();
    merged = _filterByCategory(merged, m.categoryKey);
    return merged;
  }

  String? propertyType = _mapCategoryToPropertyType(m.categoryKey);
  String? bedrooms;
  if (m.categoryKey == 'STUDIO') {
    bedrooms = 'STUDIO';
    propertyType = null;
  }

  return api.fetchProperties(
    listingType: listingType,
    propertyType: propertyType,
    bedrooms: bedrooms,
    ordering: m.ordering,
  );
});

String? _mapCategoryToPropertyType(String? key) {
  switch (key) {
    case 'APARTMENT':
      return 'APARTMENT';
    case 'VILLA':
      return 'VILLA';
    case 'CONDOMINIUM':
      return 'CONDOMINIUM';
    case 'SERVICE_HOUSE':
      return 'SERVICE_HOUSE';
    default:
      return null;
  }
}

List<PropertySummary> _filterByCategory(
    List<PropertySummary> items, String? categoryKey) {
  if (categoryKey == null) return items;
  if (categoryKey == 'STUDIO') {
    return items.where((p) => p.bedrooms == 'STUDIO').toList();
  }
  final pt = _mapCategoryToPropertyType(categoryKey);
  if (pt == null) return items;
  return items.where((p) => p.propertyType == pt).toList();
}
