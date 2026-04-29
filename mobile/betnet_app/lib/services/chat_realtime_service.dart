import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config.dart';
import 'token_storage.dart';

final chatRealtimeServiceProvider = Provider<ChatRealtimeService>((ref) {
  return ChatRealtimeService(ref.read(tokenStorageProvider));
});

class ChatRealtimeService {
  ChatRealtimeService(this._storage);
  final TokenStorage _storage;

  WebSocket? _socket;
  StreamSubscription<dynamic>? _subscription;

  Future<void> connect({
    required int conversationId,
    required void Function(Map<String, dynamic> payload) onMessage,
    required void Function(Object error) onError,
  }) async {
    if (!AppConfig.enableRealtimeChat) {
      onError(Exception('Realtime chat disabled by feature flag.'));
      return;
    }
    await disconnect();
    final token = await _storage.readAccess();
    if (token == null || token.isEmpty) {
      onError(Exception('Missing auth token for realtime chat.'));
      return;
    }
    final wsUri = _buildWsUri(
      '${AppConfig.apiBaseUrl}/ws/chat/$conversationId/?token=$token',
    );
    try {
      _socket = await WebSocket.connect(wsUri);
      _subscription = _socket!.listen(
        (event) {
          try {
            final parsed = jsonDecode(event as String);
            if (parsed is Map<String, dynamic>) onMessage(parsed);
          } catch (_) {}
        },
        onError: onError,
        onDone: () {
          if (_socket?.closeCode != WebSocketStatus.normalClosure) {
            onError(Exception('Realtime socket disconnected.'));
          }
        },
      );
    } catch (e) {
      onError(e);
    }
  }

  Future<void> sendTyping() async {
    try {
      _socket?.add(jsonEncode({'type': 'typing'}));
    } catch (_) {}
  }

  Future<void> sendMessage(String content) async {
    try {
      _socket?.add(jsonEncode({'type': 'message', 'content': content}));
    } catch (_) {}
  }

  Future<void> disconnect() async {
    await _subscription?.cancel();
    _subscription = null;
    try {
      await _socket?.close(WebSocketStatus.normalClosure);
    } catch (_) {}
    _socket = null;
  }

  @visibleForTesting
  String buildWsUriForTest(String value) => _buildWsUri(value);

  String _buildWsUri(String raw) {
    if (raw.startsWith('https://')) {
      return raw.replaceFirst('https://', 'wss://');
    }
    if (raw.startsWith('http://')) {
      return raw.replaceFirst('http://', 'ws://');
    }
    return raw;
  }
}
