import 'package:flutter/foundation.dart';

/// API and app constants. Override base URL at build time:
/// `flutter run --dart-define=BETRENT_API_BASE=http://10.0.2.2:8000`
/// (Android emulator → host machine). iOS simulator often uses localhost.
class AppConfig {
  AppConfig._();

  static const String hiveBoxName = 'betrent_cache';

  /// Django server root without trailing slash.
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment(
      'BETRENT_API_BASE',
      defaultValue: '',
    );
    if (fromEnv.isNotEmpty) return fromEnv.replaceAll(RegExp(r'/$'), '');
    if (kDebugMode) {
      return 'http://127.0.0.1:8000';
    }
    return 'https://your-production-domain.com';
  }

  /// How long to keep cached listings when offline (still shown with banner).
  static const Duration staleCacheMaxAge = Duration(hours: 48);

  /// Poll interval for in-app notifications while app is foregrounded.
  static const Duration notificationPollInterval = Duration(minutes: 2);

  /// Must match Django `LISTING_FEE_ETB` default when initiating pay-to-publish from mobile.
  static const double defaultListingFeeEtb = 150;
}
