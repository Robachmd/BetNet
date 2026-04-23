import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Browse filters aligned with Django `PropertyFilter` query params.
class BrowseFilters {
  const BrowseFilters({
    this.city,
    this.propertyType,
    this.bedrooms,
    this.priceMin,
    this.priceMax,
    this.searchQuery,
  });

  final String? city;
  final String? propertyType;
  final String? bedrooms;
  final double? priceMin;
  final double? priceMax;
  final String? searchQuery;
}

final browseFiltersProvider =
    StateProvider<BrowseFilters>((ref) => const BrowseFilters());
