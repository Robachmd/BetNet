import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../core/app_debug.dart';

const _kAccess = 'betnet_access_token';
const _kRefresh = 'betnet_refresh_token';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

/// Stores JWT access and refresh tokens in the OS keychain / Keystore.
///
/// Android: [encryptedSharedPreferences] is disabled — EncryptedSharedPreferences
/// fails on some OEM builds and can crash startup when reading tokens.
class TokenStorage {
  TokenStorage()
      : _s = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: false),
        );

  final FlutterSecureStorage _s;

  Future<void> saveTokens({required String access, required String refresh}) async {
    try {
      await _s.write(key: _kAccess, value: access);
      await _s.write(key: _kRefresh, value: refresh);
    } catch (e, st) {
      AppDebug.log('TokenStorage.saveTokens failed: $e\n$st', verbose: true);
      try {
        await _s.delete(key: _kAccess);
        await _s.delete(key: _kRefresh);
      } catch (_) {}
      rethrow;
    }
  }

  Future<String?> readAccess() async {
    try {
      return await _s.read(key: _kAccess);
    } catch (e, st) {
      AppDebug.log('TokenStorage.readAccess failed: $e\n$st', verbose: true);
      return null;
    }
  }

  Future<String?> readRefresh() async {
    try {
      return await _s.read(key: _kRefresh);
    } catch (e, st) {
      AppDebug.log('TokenStorage.readRefresh failed: $e\n$st', verbose: true);
      return null;
    }
  }

  Future<void> clear() async {
    try {
      await _s.delete(key: _kAccess);
      await _s.delete(key: _kRefresh);
    } catch (e, st) {
      AppDebug.log('TokenStorage.clear failed: $e\n$st', verbose: true);
    }
  }
}
