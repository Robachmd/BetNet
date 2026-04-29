import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../data/models/property.dart';
import '../services/betnet_api.dart';

/// One-shot device location for nearby feed (permission-aware; null if denied).
final deviceLocationProvider = FutureProvider.autoDispose<Position?>((ref) async {
  final enabled = await Geolocator.isLocationServiceEnabled();
  if (!enabled) return null;
  var perm = await Geolocator.checkPermission();
  if (perm == LocationPermission.denied) {
    perm = await Geolocator.requestPermission();
  }
  if (perm == LocationPermission.denied ||
      perm == LocationPermission.deniedForever) {
    return null;
  }
  return Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
  );
});

final featuredPropertiesProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final api = ref.watch(betNetApiProvider);
  return api.fetchFeaturedProperties();
});

final newestPropertiesProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final api = ref.watch(betNetApiProvider);
  return api.fetchProperties(ordering: '-created_at');
});

final nearbyPropertiesProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final loc = await ref.watch(deviceLocationProvider.future);
  if (loc == null) return [];
  final api = ref.watch(betNetApiProvider);
  return api.fetchNearbyProperties(lat: loc.latitude, lng: loc.longitude);
});
