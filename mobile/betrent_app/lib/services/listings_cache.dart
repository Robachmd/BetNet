import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../core/config.dart';
import '../data/models/property.dart';

final listingsCacheProvider = Provider<ListingsCache>((ref) => ListingsCache());

/// Persists the last successful browse results for offline/low-connectivity use.
class ListingsCache {
  static const _keyPayload = 'listings_json';
  static const _keyAt = 'listings_cached_at';

  Box get _box => Hive.box(AppConfig.hiveBoxName);

  Future<void> saveList(List<PropertySummary> items) async {
    final raw = items.map((e) => e.toJson()).toList();
    await _box.put(_keyPayload, jsonEncode(raw));
    await _box.put(_keyAt, DateTime.now().toIso8601String());
  }

  /// Returns null if no cache or parse error.
  Future<CachedListings?> readList() async {
    final s = _box.get(_keyPayload) as String?;
    final ats = _box.get(_keyAt) as String?;
    if (s == null || ats == null) return null;
    final at = DateTime.tryParse(ats);
    if (at == null) return null;
    try {
      final list = (jsonDecode(s) as List<dynamic>)
          .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
          .toList();
      return CachedListings(properties: list, cachedAt: at);
    } catch (_) {
      return null;
    }
  }
}

class CachedListings {
  CachedListings({required this.properties, required this.cachedAt});

  final List<PropertySummary> properties;
  final DateTime cachedAt;
}
