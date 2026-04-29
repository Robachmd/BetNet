import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/property.dart';
import '../services/betnet_api.dart';

class HallBrowseFilters {
  const HallBrowseFilters({
    this.city,
    this.subCity,
    this.hallType,
    this.capacityMin,
    this.capacityMax,
    this.pricePerHourMin,
    this.pricePerHourMax,
  });

  final String? city;
  final String? subCity;
  final String? hallType;
  final int? capacityMin;
  final int? capacityMax;
  final double? pricePerHourMin;
  final double? pricePerHourMax;
}

final hallBrowseFiltersProvider =
    StateProvider<HallBrowseFilters>((ref) => const HallBrowseFilters());

/// Matches web HallRentalPage sort keys → DRF `ordering` param.
final hallSortOrderingProvider = StateProvider<String>(
  (ref) => '-property__created_at',
);

final hallListingsProvider = FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final f = ref.watch(hallBrowseFiltersProvider);
  final ordering = ref.watch(hallSortOrderingProvider);
  return ref.watch(betNetApiProvider).fetchHallRentals(
        city: f.city,
        subCity: f.subCity,
        hallType: f.hallType,
        capacityMin: f.capacityMin,
        capacityMax: f.capacityMax,
        pricePerHourMin: f.pricePerHourMin,
        pricePerHourMax: f.pricePerHourMax,
        ordering: ordering,
      );
});
