import 'dart:async';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../core/config.dart';
import 'betnet_api.dart';

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(ref.read(betNetApiProvider));
});

class PushNotificationService {
  PushNotificationService(this._api);
  final BetNetApi _api;

  static const _tokenKey = 'debug_push_token';
  StreamController<Map<String, dynamic>>? _foregroundEvents;
  String? _token;

  Stream<Map<String, dynamic>> get foregroundMessages {
    _foregroundEvents ??= StreamController<Map<String, dynamic>>.broadcast();
    return _foregroundEvents!.stream;
  }

  Future<void> start() async {
    if (!AppConfig.enablePushFoundation) return;
    _token = _loadOrCreateToken();
    try {
      await _api.registerPushToken(
        token: _token!,
        platform: Platform.isAndroid ? 'android' : 'ios',
      );
    } catch (_) {
      // Endpoint is optional per deployment; keep app stable.
    }
  }

  Future<void> stop() async {
    final token = _token;
    _token = null;
    if (!AppConfig.enablePushFoundation || token == null) return;
    try {
      await _api.unregisterPushToken(token);
    } catch (_) {}
  }

  /// Debug helper to simulate foreground payload handling without FCM wiring.
  void emitForegroundPayload(Map<String, dynamic> payload) {
    _foregroundEvents ??= StreamController<Map<String, dynamic>>.broadcast();
    _foregroundEvents!.add(payload);
  }

  String _loadOrCreateToken() {
    final box = Hive.box(AppConfig.hiveBoxName);
    final existing = box.get(_tokenKey) as String?;
    if (existing != null && existing.isNotEmpty) return existing;
    final created = 'debug-${DateTime.now().millisecondsSinceEpoch}';
    box.put(_tokenKey, created);
    return created;
  }
}
