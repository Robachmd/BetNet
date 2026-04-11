import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config.dart';
import '../data/models/chat.dart';
import '../data/models/notification_item.dart';
import '../data/models/property.dart';
import '../data/models/user.dart';
import 'token_storage.dart';

/// Resolves after [AuthNotifier] constructs (it owns the single [BetRentApi] instance).
final betRentApiProvider = Provider<BetRentApi>((ref) {
  return ref.read(authControllerProvider.notifier).api;
});

// Forward declaration: implemented in auth_provider.dart
final authControllerProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier(ref));

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class BetRentApi {
  BetRentApi(this._storage, {this.onSessionExpired}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 25),
        receiveTimeout: const Duration(seconds: 25),
        headers: {'Accept': 'application/json'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final t = await _storage.readAccess();
          if (t != null && t.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $t';
          }
          return handler.next(options);
        },
        onError: (err, handler) async {
          if (err.response?.statusCode != 401) {
            return handler.next(err);
          }
          final path = err.requestOptions.path;
          if (path.contains('/accounts/token/refresh/') ||
              path.contains('/accounts/login/') ||
              path.contains('/accounts/register/')) {
            return handler.next(err);
          }
          final ok = await _tryRefresh();
          if (!ok) {
            await _storage.clear();
            onSessionExpired?.call();
            return handler.next(err);
          }
          final req = err.requestOptions;
          final token = await _storage.readAccess();
          if (token != null) {
            req.headers['Authorization'] = 'Bearer $token';
          }
          try {
            final clone = await _dio.fetch(req);
            return handler.resolve(clone);
          } catch (e) {
            return handler.next(err);
          }
        },
      ),
    );
  }

  final TokenStorage _storage;
  final void Function()? onSessionExpired;
  late final Dio _dio;

  Future<bool> _tryRefresh() async {
    final refresh = await _storage.readRefresh();
    if (refresh == null || refresh.isEmpty) return false;
    try {
      final res = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl)).post(
        '/api/accounts/token/refresh/',
        data: {'refresh': refresh},
        options: Options(headers: {'Accept': 'application/json'}),
      );
      final access = res.data['access'] as String?;
      if (access == null) return false;
      await _storage.saveTokens(access: access, refresh: refresh);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<BetRentUser?> restoreUser() async {
    var token = await _storage.readAccess();
    if (token == null || token.isEmpty) {
      final ok = await _tryRefresh();
      if (!ok) return null;
      token = await _storage.readAccess();
    }
    try {
      final res = await _dio.get('/api/accounts/profile/');
      return BetRentUser.fromJson(res.data as Map<String, dynamic>);
    } catch (_) {
      final ok = await _tryRefresh();
      if (!ok) return null;
      try {
        final res = await _dio.get('/api/accounts/profile/');
        return BetRentUser.fromJson(res.data as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }
  }

  Future<({BetRentUser user, String access, String refresh})> login({
    required String phoneE164,
    required String password,
  }) async {
    final res = await _dio.post(
      '/api/accounts/login/',
      data: {'phone_number': phoneE164, 'password': password},
    );
    final data = res.data as Map<String, dynamic>;
    final tokens = data['tokens'] as Map<String, dynamic>;
    final access = tokens['access'] as String;
    final refresh = tokens['refresh'] as String;
    await _storage.saveTokens(access: access, refresh: refresh);
    final user = BetRentUser.fromJson(data['user'] as Map<String, dynamic>);
    return (user: user, access: access, refresh: refresh);
  }

  Future<({BetRentUser user, String access, String refresh})> register({
    required String phoneE164,
    required String password,
    required String passwordConfirm,
    required String firstName,
    required String lastName,
    required String role,
    String email = '',
    String preferredLanguage = 'EN',
  }) async {
    final res = await _dio.post(
      '/api/accounts/register/',
      data: {
        'phone_number': phoneE164,
        'password': password,
        'password_confirm': passwordConfirm,
        'first_name': firstName,
        'last_name': lastName,
        'email': email,
        'role': role,
        'preferred_language': preferredLanguage,
      },
    );
    final data = res.data as Map<String, dynamic>;
    final tokens = data['tokens'] as Map<String, dynamic>;
    final access = tokens['access'] as String;
    final refresh = tokens['refresh'] as String;
    await _storage.saveTokens(access: access, refresh: refresh);
    final user = BetRentUser.fromJson(data['user'] as Map<String, dynamic>);
    return (user: user, access: access, refresh: refresh);
  }

  Future<void> logout() async {
    final refresh = await _storage.readRefresh();
    if (refresh != null) {
      try {
        await _dio.post('/api/accounts/logout/', data: {'refresh': refresh});
      } catch (_) {}
    }
    await _storage.clear();
  }

  /// Django REST Framework returns `{ results: [...], count, ... }` for list views.
  List<dynamic> _unwrapList(dynamic data) {
    if (data is List<dynamic>) return data;
    if (data is Map && data['results'] is List) {
      return List<dynamic>.from(data['results'] as List);
    }
    throw ApiException('Unexpected API list format');
  }

  Map<String, dynamic> _withPageSize(Map<String, dynamic>? q) {
    final m = <String, dynamic>{...(q ?? {}), 'page_size': 100};
    return m;
  }

  String _msgFromDio(DioException e) {
    final d = e.response?.data;
    if (d is Map && d['detail'] != null) return '${d['detail']}';
    if (d is Map && d['non_field_errors'] != null) {
      return '${(d['non_field_errors'] as List).first}';
    }
    if (d is Map) {
      for (final entry in d.entries) {
        if (entry.value is List && (entry.value as List).isNotEmpty) {
          return '${entry.key}: ${(entry.value as List).first}';
        }
      }
    }
    return e.message ?? 'Network error';
  }

  Future<List<PropertySummary>> fetchProperties({
    String? city,
    String? propertyType,
    String? bedrooms,
    double? priceMin,
    double? priceMax,
    String? search,
  }) async {
    final q = <String, dynamic>{};
    if (city != null && city.isNotEmpty) q['city'] = city;
    if (propertyType != null && propertyType.isNotEmpty) {
      q['property_type'] = propertyType;
    }
    if (bedrooms != null && bedrooms.isNotEmpty) q['bedrooms'] = bedrooms;
    if (priceMin != null) q['price_min'] = priceMin;
    if (priceMax != null) q['price_max'] = priceMax;
    if (search != null && search.isNotEmpty) q['search'] = search;
    try {
      final res = await _dio.get(
        '/api/properties/properties/',
        queryParameters: _withPageSize(q),
      );
      final list = _unwrapList(res.data);
      return list
          .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<List<PropertySummary>> searchProperties(String q) async {
    try {
      final res = await _dio.get(
        '/api/properties/search/',
        queryParameters: _withPageSize({'q': q}),
      );
      final list = _unwrapList(res.data);
      return list
          .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<PropertyDetail> fetchPropertyDetail(String slug) async {
    try {
      final res = await _dio.get('/api/properties/properties/$slug/');
      return PropertyDetail.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<void> addFavorite(int propertyId) async {
    await _dio.post('/api/properties/favorites/', data: {'property': propertyId});
  }

  Future<void> removeFavorite(int favoriteId) async {
    await _dio.delete('/api/properties/favorites/$favoriteId/');
  }

  Future<List<PropertySummary>> fetchFavorites() async {
    final res = await _dio.get(
      '/api/properties/favorites/',
      queryParameters: const {'page_size': 100},
    );
    final list = _unwrapList(res.data);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      final detail = m['property_detail'] as Map<String, dynamic>?;
      if (detail != null) {
        return PropertySummary.fromJson(detail);
      }
      throw ApiException('Invalid favorite payload');
    }).toList();
  }

  Future<Map<String, dynamic>> createProperty({
    required String title,
    required String description,
    required String propertyType,
    required String bedrooms,
    required double priceMonthly,
    required String city,
    required String subCity,
    required String specificLocation,
  }) async {
    final body = {
      'title': title,
      'description': description,
      'property_type': propertyType,
      'bedrooms': bedrooms,
      'bathrooms': 1,
      'price_monthly': priceMonthly.toStringAsFixed(2),
      'price_currency': 'ETB',
      'listing_type': 'rent',
      'location': {
        'city': city,
        'sub_city': subCity,
        'woreda': '',
        'kebele': '',
        'specific_location': specificLocation,
        'maps_url': '',
        'latitude': null,
        'longitude': null,
      },
      'amenities': {
        'water_availability': 'SOMETIMES',
        'electricity_stability': 'MODERATE',
        'has_parking': false,
        'has_wifi': false,
        'has_security': false,
        'has_generator': false,
        'is_furnished': false,
        'has_elevator': false,
        'has_balcony': false,
        'has_garden': false,
        'has_cctv': false,
        'pets_allowed': false,
      },
    };
    final res = await _dio.post('/api/properties/properties/', data: body);
    return res.data as Map<String, dynamic>;
  }

  /// Starts a server-side payment and returns `checkout_url` when the provider supports redirect.
  /// [paymentType] e.g. `LISTING_FEE`, `FEATURED_LISTING`; [paymentMethod] `CHAPA`, `TELEBIRR`, `STRIPE`.
  Future<Map<String, dynamic>> initiatePayment({
    required String paymentType,
    required double amount,
    required String paymentMethod,
    int? propertyId,
    int? hallBookingId,
    String description = '',
    String? phone,
  }) async {
    final base = AppConfig.apiBaseUrl;
    final res = await _dio.post(
      '/api/payments/initiate/',
      data: <String, dynamic>{
        'payment_type': paymentType,
        'amount': amount.toStringAsFixed(2),
        'currency': 'ETB',
        'payment_method': paymentMethod,
        if (propertyId != null) 'property_id': propertyId,
        if (hallBookingId != null) 'hall_booking_id': hallBookingId,
        'description': description,
        'callback_url': '$base/',
        'return_url': '$base/',
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    final raw = res.data;
    if (raw is! Map) {
      throw ApiException('Unexpected payment response');
    }
    return Map<String, dynamic>.from(raw);
  }

  Future<void> uploadPropertyImage({
    required String propertySlug,
    required String filePath,
    bool isPrimary = false,
  }) async {
    final name = filePath.split(RegExp(r'[/\\]')).last;
    final form = FormData.fromMap({
      'image': await MultipartFile.fromFile(filePath, filename: name),
      'is_primary': isPrimary ? 'true' : 'false',
    });
    await _dio.post(
      '/api/properties/properties/$propertySlug/images/',
      data: form,
    );
  }

  Future<List<ConversationListItem>> fetchConversations() async {
    final res = await _dio.get(
      '/api/chat/conversations/',
      queryParameters: const {'page_size': 100},
    );
    final list = _unwrapList(res.data);
    return list
        .map((e) => ConversationListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> createConversation({
    required int participantId,
    int? propertyId,
    String initialMessage = '',
  }) async {
    final res = await _dio.post(
      '/api/chat/conversations/',
      data: {
        'participant_id': participantId,
        if (propertyId != null) 'property_id': propertyId,
        'initial_message': initialMessage,
      },
    );
    final data = res.data as Map<String, dynamic>;
    return data['id'] as int;
  }

  Future<List<ChatMessage>> fetchMessages(int conversationId) async {
    final res = await _dio.get(
      '/api/chat/conversations/$conversationId/messages/',
      queryParameters: const {'page_size': 200},
    );
    final list = _unwrapList(res.data);
    return list
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> sendMessage(int conversationId, String text) async {
    await _dio.post(
      '/api/chat/conversations/$conversationId/messages/',
      data: {
        'content': text,
        'message_type': 'TEXT',
      },
    );
  }

  Future<List<AppNotification>> fetchNotifications() async {
    final res = await _dio.get(
      '/api/notifications/',
      queryParameters: const {'page_size': 100},
    );
    final list = _unwrapList(res.data);
    return list
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> notificationUnreadCount() async {
    final res = await _dio.get('/api/notifications/unread-count/');
    return (res.data as Map<String, dynamic>)['unread_count'] as int? ?? 0;
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.post('/api/notifications/mark-read/', data: <String, dynamic>{});
  }

  Future<void> markNotificationRead(int id) async {
    await _dio.post(
      '/api/notifications/mark-read/',
      data: {'notification_id': id},
    );
  }
}

// ── Auth state (lives next to API to avoid circular imports) ─────────────────

enum AuthPhase { bootstrapping, guest, authenticated }

class AuthState {
  const AuthState._(this.phase, this.user);
  const AuthState.bootstrapping() : this._(AuthPhase.bootstrapping, null);
  const AuthState.guest() : this._(AuthPhase.guest, null);
  const AuthState.authenticated(BetRentUser user)
      : this._(AuthPhase.authenticated, user);

  final AuthPhase phase;
  final BetRentUser? user;

  bool get isAuthenticated =>
      phase == AuthPhase.authenticated && user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this.ref)
      : super(const AuthState.bootstrapping()) {
    _api = BetRentApi(
      ref.read(tokenStorageProvider),
      onSessionExpired: () {
        state = const AuthState.guest();
      },
    );
    _bootstrap();
  }

  final Ref ref;
  late final BetRentApi _api;
  BetRentApi get api => _api;

  Future<void> _bootstrap() async {
    final user = await _api.restoreUser();
    state = user != null
        ? AuthState.authenticated(user)
        : const AuthState.guest();
  }

  Future<void> login(String phoneE164, String password) async {
    final r = await _api.login(phoneE164: phoneE164, password: password);
    state = AuthState.authenticated(r.user);
  }

  Future<void> register({
    required String phoneE164,
    required String password,
    required String passwordConfirm,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    final r = await _api.register(
      phoneE164: phoneE164,
      password: password,
      passwordConfirm: passwordConfirm,
      firstName: firstName,
      lastName: lastName,
      role: role,
    );
    state = AuthState.authenticated(r.user);
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AuthState.guest();
  }
}
