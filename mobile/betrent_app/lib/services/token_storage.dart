import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kAccess = 'betrent_access_token';
const _kRefresh = 'betrent_refresh_token';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

/// Stores JWT access and refresh tokens in the OS keychain / Keystore.
class TokenStorage {
  TokenStorage()
      : _s = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  final FlutterSecureStorage _s;

  Future<void> saveTokens({required String access, required String refresh}) async {
    await _s.write(key: _kAccess, value: access);
    await _s.write(key: _kRefresh, value: refresh);
  }

  Future<String?> readAccess() => _s.read(key: _kAccess);
  Future<String?> readRefresh() => _s.read(key: _kRefresh);

  Future<void> clear() async {
    await _s.delete(key: _kAccess);
    await _s.delete(key: _kRefresh);
  }
}
