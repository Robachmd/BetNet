import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config.dart';
import '../data/models/property.dart';
import '../services/betnet_api.dart';
import '../services/listings_cache.dart';
import 'filters_provider.dart';

class ListingsResult {
  ListingsResult({
    required this.items,
    required this.fromCache,
    required this.stale,
    this.errorMessage,
  });

  final List<PropertySummary> items;
  final bool fromCache;
  final bool stale;
  final String? errorMessage;
}

/// Fetches properties with current filters. On failure, serves the last Hive cache if present.
final listingsProvider = FutureProvider.autoDispose<ListingsResult>((ref) async {
  final filters = ref.watch(browseFiltersProvider);
  final api = ref.watch(betNetApiProvider);
  final cache = ref.read(listingsCacheProvider);

  Future<ListingsResult> fromCacheIfAny(String? err) async {
    final cached = await cache.readList();
    if (cached == null) {
      return ListingsResult(
        items: const [],
        fromCache: false,
        stale: false,
        errorMessage: err ?? 'Could not load listings.',
      );
    }
    final age = DateTime.now().difference(cached.cachedAt);
    return ListingsResult(
      items: cached.properties,
      fromCache: true,
      stale: age > AppConfig.staleCacheMaxAge,
      errorMessage: err,
    );
  }

  try {
    final items = await api.fetchProperties(
      city: filters.city,
      subCity: filters.subCity,
      propertyType: filters.propertyType,
      bedrooms: filters.bedrooms,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      search: filters.searchQuery,
      listingType: filters.listingType,
      ordering: filters.ordering,
      createdAfter: filters.createdAfter,
      createdBefore: filters.createdBefore,
      hasParking: filters.hasParking,
      hasWifi: filters.hasWifi,
      hasSecurity: filters.hasSecurity,
      hasGenerator: filters.hasGenerator,
      isFurnished: filters.isFurnished,
      hasElevator: filters.hasElevator,
      petsAllowed: filters.petsAllowed,
    );
    await cache.saveList(items);
    return ListingsResult(
      items: items,
      fromCache: false,
      stale: false,
    );
  } catch (e) {
    return fromCacheIfAny('$e');
  }
});
