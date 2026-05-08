import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Browse filters aligned with Django `PropertyFilter` query params.
class BrowseFilters {
  const BrowseFilters({
    this.city,
    this.subCity,
    this.propertyType,
    this.bedrooms,
    this.priceMin,
    this.priceMax,
    this.searchQuery,
    this.listingType,
    this.ordering,
    this.createdAfter,
    this.createdBefore,
    this.hasParking,
    this.hasWifi,
    this.hasSecurity,
    this.hasGenerator,
    this.isFurnished,
    this.hasElevator,
    this.petsAllowed,
  });

  final String? city;
  final String? subCity;
  final String? propertyType;
  final String? bedrooms;
  final double? priceMin;
  final double? priceMax;
  final String? searchQuery;
  /// Django `listing_type`: rent | sale | short_term
  final String? listingType;
  /// DRF ordering, e.g. `-created_at`, `price_monthly`, `-price_monthly`
  final String? ordering;
  /// Date filters (YYYY-MM-DD), mapped to `PropertyFilter` created_after/created_before.
  final String? createdAfter;
  final String? createdBefore;
  final bool? hasParking;
  final bool? hasWifi;
  final bool? hasSecurity;
  final bool? hasGenerator;
  final bool? isFurnished;
  final bool? hasElevator;
  final bool? petsAllowed;

  BrowseFilters copyWith({
    String? city,
    String? subCity,
    String? propertyType,
    String? bedrooms,
    double? priceMin,
    double? priceMax,
    String? searchQuery,
    String? listingType,
    String? ordering,
    String? createdAfter,
    String? createdBefore,
    bool? hasParking,
    bool? hasWifi,
    bool? hasSecurity,
    bool? hasGenerator,
    bool? isFurnished,
    bool? hasElevator,
    bool? petsAllowed,
    bool clearCity = false,
    bool clearSubCity = false,
    bool clearPropertyType = false,
    bool clearBedrooms = false,
    bool clearPrice = false,
    bool clearSearch = false,
    bool clearListingType = false,
    bool clearOrdering = false,
    bool clearCreatedRange = false,
  }) {
    return BrowseFilters(
      city: clearCity ? null : (city ?? this.city),
      subCity: clearSubCity ? null : (subCity ?? this.subCity),
      propertyType: clearPropertyType ? null : (propertyType ?? this.propertyType),
      bedrooms: clearBedrooms ? null : (bedrooms ?? this.bedrooms),
      priceMin: clearPrice ? null : (priceMin ?? this.priceMin),
      priceMax: clearPrice ? null : (priceMax ?? this.priceMax),
      searchQuery: clearSearch ? null : (searchQuery ?? this.searchQuery),
      listingType: clearListingType ? null : (listingType ?? this.listingType),
      ordering: clearOrdering ? null : (ordering ?? this.ordering),
      createdAfter: clearCreatedRange ? null : (createdAfter ?? this.createdAfter),
      createdBefore: clearCreatedRange ? null : (createdBefore ?? this.createdBefore),
      hasParking: hasParking ?? this.hasParking,
      hasWifi: hasWifi ?? this.hasWifi,
      hasSecurity: hasSecurity ?? this.hasSecurity,
      hasGenerator: hasGenerator ?? this.hasGenerator,
      isFurnished: isFurnished ?? this.isFurnished,
      hasElevator: hasElevator ?? this.hasElevator,
      petsAllowed: petsAllowed ?? this.petsAllowed,
    );
  }
}

final browseFiltersProvider =
    StateProvider<BrowseFilters>((ref) => const BrowseFilters());
