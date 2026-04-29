import 'package:flutter/foundation.dart';

/// Debug-only switches and logging for dev / QA builds.
///
/// **Crash diagnosis (Android):** with USB debugging on, run:
/// `adb logcat | findstr /i "flutter AndroidRuntime FATAL Exception PlatformException secure_storage"`
/// (PowerShell/CMD on Windows). Look for `flutter_secure_storage` or `EncryptedSharedPreferences`.
///
/// Verbose logs (optional):
/// `flutter run --dart-define=BETNET_DEBUG_VERBOSE=true`
class AppDebug {
  AppDebug._();

  static const bool _verbose = bool.fromEnvironment(
    'BETNET_DEBUG_VERBOSE',
    defaultValue: false,
  );

  /// True in Flutter debug builds (`flutter run`, not profile/release).
  static bool get isDebugBuild => kDebugMode;

  /// Extra console output (API paths, cache hits, etc.) when enabled via
  /// `--dart-define` and only in debug mode.
  static bool get verboseLogging => kDebugMode && _verbose;

  /// Safe debug print: no-op in release; respects [verboseLogging] for noisy messages.
  static void log(String message, {bool verbose = false}) {
    if (!kDebugMode) return;
    if (verbose && !_verbose) return;
    debugPrint('[BetNet] $message');
  }
}
