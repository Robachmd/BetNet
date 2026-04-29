import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// API and app constants. Override base URL at build time:
/// `flutter run --dart-define=BETNET_API_BASE=http://10.0.2.2:8000`
/// (Android emulator → host machine). iOS simulator often uses localhost.
class AppConfig {
  AppConfig._();

  static const String hiveBoxName = 'betnet_cache';
  static const String _debugApiBaseOverrideKey = 'debug_api_base_override';
  static String? _runtimeApiBaseOverride;

  static String _normalizeBaseUrl(String raw) {
    return raw.trim().replaceAll(RegExp(r'/$'), '');
  }

  static Future<void> loadApiBaseOverride() async {
    if (!Hive.isBoxOpen(hiveBoxName)) return;
    final raw = Hive.box(hiveBoxName).get(_debugApiBaseOverrideKey) as String?;
    if (raw == null || raw.trim().isEmpty) {
      _runtimeApiBaseOverride = null;
      return;
    }
    _runtimeApiBaseOverride = _normalizeBaseUrl(raw);
  }

  static String? get debugApiBaseOverride => _runtimeApiBaseOverride;

  static Future<void> setDebugApiBaseOverride(String value) async {
    final normalized = _normalizeBaseUrl(value);
    _runtimeApiBaseOverride = normalized;
    if (Hive.isBoxOpen(hiveBoxName)) {
      await Hive.box(hiveBoxName).put(_debugApiBaseOverrideKey, normalized);
    }
  }

  static Future<void> clearDebugApiBaseOverride() async {
    _runtimeApiBaseOverride = null;
    if (Hive.isBoxOpen(hiveBoxName)) {
      await Hive.box(hiveBoxName).delete(_debugApiBaseOverrideKey);
    }
  }

  /// Django server root without trailing slash.
  static String get apiBaseUrl {
    if (_runtimeApiBaseOverride != null && _runtimeApiBaseOverride!.isNotEmpty) {
      return _runtimeApiBaseOverride!;
    }
    const fromEnv = String.fromEnvironment(
      'BETNET_API_BASE',
      defaultValue: '',
    );
    if (fromEnv.isNotEmpty) return _normalizeBaseUrl(fromEnv);
    if (kDebugMode) {
      return 'http://127.0.0.1:8000';
    }
    return 'https://your-production-domain.com';
  }

  /// How long to keep cached listings when offline (still shown with banner).
  static const Duration staleCacheMaxAge = Duration(hours: 48);

  /// Poll interval for in-app notifications while app is foregrounded.
  static const Duration notificationPollInterval = Duration(minutes: 2);

  /// Optional realtime enhancements can be switched off quickly in debug.
  static const bool enableRealtimeChat = true;
  static const bool enablePushFoundation = true;

  /// Must match Django `LISTING_FEE_ETB` default when initiating pay-to-publish from mobile.
  static const double defaultListingFeeEtb = 150;
}
