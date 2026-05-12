import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_debug.dart';
import '../core/config.dart';
import '../core/go_router_refresh.dart';
import '../data/models/chat.dart';
import '../data/models/hall_booking.dart';
import '../data/models/listing_package.dart';
import '../data/models/location_alert.dart';
import '../data/models/notification_item.dart';
import '../data/models/booking.dart';
import '../data/models/property.dart';
import '../data/models/review.dart';
import '../data/models/user.dart';
import 'token_storage.dart';

/// Resolves after [AuthNotifier] constructs (it owns the single [BetNetApi] instance).
final betNetApiProvider = Provider<BetNetApi>((ref) {
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

class BetNetApi {
  BetNetApi(this._storage, {this.onSessionExpired}) {
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
              path.contains('/accounts/register/') ||
              path.contains('/accounts/password-reset/')) {
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

  String get baseUrl => _dio.options.baseUrl;

  void setBaseUrl(String value) {
    _dio.options.baseUrl = value.trim().replaceAll(RegExp(r'/$'), '');
  }

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

  Future<BetNetUser?> restoreUser() async {
    var token = await _storage.readAccess();
    if (token == null || token.isEmpty) {
      final ok = await _tryRefresh();
      if (!ok) return null;
      token = await _storage.readAccess();
    }
    try {
      final res = await _dio.get('/api/accounts/profile/');
      return BetNetUser.fromJson(res.data as Map<String, dynamic>);
    } catch (_) {
      final ok = await _tryRefresh();
      if (!ok) return null;
      try {
        final res = await _dio.get('/api/accounts/profile/');
        return BetNetUser.fromJson(res.data as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }
  }

  Future<({BetNetUser user, String access, String refresh})> login({
    required String identifier,
    required String password,
  }) async {
    try {
      final res = await _dio.post(
        '/api/accounts/login/',
        data: {'identifier': identifier, 'password': password},
      );
      final data = res.data as Map<String, dynamic>;
      final tokens = data['tokens'] as Map<String, dynamic>;
      final access = tokens['access'] as String;
      final refresh = tokens['refresh'] as String;
      await _storage.saveTokens(access: access, refresh: refresh);
      final user = BetNetUser.fromJson(data['user'] as Map<String, dynamic>);
      return (user: user, access: access, refresh: refresh);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<({BetNetUser user, String access, String refresh})> register({
    required String phoneE164,
    required String password,
    required String passwordConfirm,
    required String firstName,
    required String lastName,
    required String role,
    String email = '',
    String preferredLanguage = 'EN',
  }) async {
    try {
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
      final user = BetNetUser.fromJson(data['user'] as Map<String, dynamic>);
      return (user: user, access: access, refresh: refresh);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
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

  Future<void> requestOtp(String phoneE164) async {
    try {
      await _dio.post('/api/accounts/otp/request/', data: {'phone_number': phoneE164});
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  /// Same as [requestOtp] but uses the password-reset URL (identical backend behavior).
  Future<void> requestPasswordResetOtp(String phoneE164) async {
    try {
      await _dio.post(
        '/api/accounts/password-reset/request/',
        data: {'phone_number': phoneE164},
      );
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  /// Completes password reset and stores JWTs (same shape as login response).
  Future<({BetNetUser user, String access, String refresh})> confirmPasswordReset({
    required String phoneE164,
    required String otp,
    required String newPassword,
    required String newPasswordConfirm,
  }) async {
    try {
      final res = await _dio.post(
        '/api/accounts/password-reset/confirm/',
        data: {
          'phone_number': phoneE164,
          'otp': otp,
          'new_password': newPassword,
          'new_password_confirm': newPasswordConfirm,
        },
      );
      final data = res.data as Map<String, dynamic>;
      final tokens = data['tokens'] as Map<String, dynamic>?;
      if (tokens == null) {
        throw ApiException('Password reset response missing tokens');
      }
      final access = tokens['access'] as String;
      final refresh = tokens['refresh'] as String;
      await _storage.saveTokens(access: access, refresh: refresh);
      final userJson = data['user'] as Map<String, dynamic>?;
      final user = userJson != null
          ? BetNetUser.fromJson(userJson)
          : await restoreUser();
      if (user == null) {
        throw ApiException('Could not load user after password reset');
      }
      return (user: user, access: access, refresh: refresh);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  /// Completes phone verification; loads profile after tokens are stored.
  Future<BetNetUser> verifyOtpAndRestoreSession({
    required String phoneE164,
    required String otp,
  }) async {
    try {
      final res = await _dio.post(
        '/api/accounts/otp/verify/',
        data: {'phone_number': phoneE164, 'otp': otp},
      );
      final data = res.data as Map<String, dynamic>;
      final tokens = data['tokens'] as Map<String, dynamic>?;
      if (tokens == null) {
        throw ApiException('OTP response missing tokens');
      }
      final access = tokens['access'] as String;
      final refresh = tokens['refresh'] as String;
      await _storage.saveTokens(access: access, refresh: refresh);
      final user = await restoreUser();
      if (user == null) {
        throw ApiException('Could not load profile after OTP');
      }
      return user;
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<BetNetUser> patchProfile(Map<String, dynamic> body) async {
    try {
      final res = await _dio.patch('/api/accounts/profile/', data: body);
      return BetNetUser.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<BetNetUser> switchWorkspace(String mode) async {
    try {
      final res = await _dio.post(
        '/api/accounts/switch-workspace/',
        data: {'mode': mode},
      );
      final data = res.data;
      if (data is Map && data['user'] is Map) {
        return BetNetUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
      }
      if (data is Map) return BetNetUser.fromJson(Map<String, dynamic>.from(data));
      throw ApiException('Unexpected switch-workspace response');
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<BetNetUser> patchProfileWithAvatar({
    required Map<String, String> fields,
    required String filePath,
    required String filename,
  }) async {
    try {
      final form = FormData.fromMap({
        ...fields,
        'profile_image': await MultipartFile.fromFile(filePath, filename: filename),
      });
      final res = await _dio.patch(
        '/api/accounts/profile/',
        data: form,
      );
      return BetNetUser.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
    required String newPasswordConfirm,
  }) async {
    try {
      await _dio.post(
        '/api/accounts/change-password/',
        data: {
          'old_password': oldPassword,
          'new_password': newPassword,
          'new_password_confirm': newPasswordConfirm,
        },
      );
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<BetNetUser> enablePropertyOwner() async {
    try {
      late Response<dynamic> res;
      try {
        res = await _dio.post('/api/accounts/enable-property-owner/');
      } on DioException catch (e) {
        if (e.response?.statusCode == 404) {
          res = await _dio.post('/api/accounts/enable-landlord/');
        } else {
          rethrow;
        }
      }
      final data = res.data as Map<String, dynamic>;
      final u = data['user'] as Map<String, dynamic>?;
      if (u != null) return BetNetUser.fromJson(u);
      final again = await restoreUser();
      if (again != null) return again;
      throw ApiException('Could not refresh profile after enabling owner mode');
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
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

  List<Map<String, dynamic>> _unwrapMapList(dynamic data) {
    final list = _unwrapList(data);
    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  String _msgFromDio(DioException e) {
    final d = e.response?.data;
    if (d is Map && d['detail'] != null) return '${d['detail']}';
    if (d is Map && d['non_field_errors'] != null) {
      return '${(d['non_field_errors'] as List).first}';
    }
    if (d is Map) {
      final parts = <String>[];
      for (final entry in d.entries) {
        final key = '${entry.key}';
        final value = entry.value;
        if (value is List && value.isNotEmpty) {
          parts.add('$key: ${value.map((v) => '$v').join(', ')}');
          continue;
        }
        if (value is String && value.trim().isNotEmpty) {
          parts.add('$key: $value');
        }
      }
      if (parts.isNotEmpty) return parts.join('\n');
    }
    if (d is String && d.contains('Invalid HTTP_HOST header')) {
      return 'Server rejected this device host. Add your PC LAN IP to Django ALLOWED_HOSTS and restart backend.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Cannot reach server at ${AppConfig.apiBaseUrl}. On a phone, 127.0.0.1 is wrong, use your PC Wi‑Fi IP (example http://192.168.1.50:8000). Run Django with "python manage.py runserver 0.0.0.0:8000". Debug: tap "Change server URL" on this error or Profile → Debug backend URL. Or rebuild: flutter build apk --debug --dart-define=BETNET_API_BASE=http://<your-ip>:8000.';
    }
    return e.message ?? 'Network error';
  }

  Future<List<PropertySummary>> fetchFeaturedProperties() async {
    try {
      final res = await _dio.get(
        '/api/properties/featured/',
        queryParameters: _withPageSize(null),
      );
      final list = _unwrapList(res.data);
      return list
          .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<List<PropertySummary>> fetchNearbyProperties({
    required double lat,
    required double lng,
    double radiusKm = 5,
  }) async {
    try {
      final res = await _dio.get(
        '/api/properties/nearby/',
        queryParameters: _withPageSize({
          'lat': lat,
          'lng': lng,
          'radius_km': radiusKm,
        }),
      );
      final list = _unwrapList(res.data);
      return list
          .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }

  Future<List<PropertySummary>> fetchProperties({
    String? city,
    String? subCity,
    String? propertyType,
    String? bedrooms,
    double? priceMin,
    double? priceMax,
    String? search,
    String? listingType,
    String? ordering,
    String? createdAfter,
    String? createdBefore,
    bool? hasParking,
    bool? hasWifi,
    bool? hasSecurity,
    bool? hasGenerator,
    bool? isFurnished,
    bool? hasElevator,
    bool? petsAllowed,
  }) async {
    final q = <String, dynamic>{};
    if (city != null && city.isNotEmpty) q['city'] = city;
    if (subCity != null && subCity.isNotEmpty) q['sub_city'] = subCity;
    if (propertyType != null && propertyType.isNotEmpty) {
      q['property_type'] = propertyType;
    }
    if (bedrooms != null && bedrooms.isNotEmpty) q['bedrooms'] = bedrooms;
    if (priceMin != null) q['price_min'] = priceMin;
    if (priceMax != null) q['price_max'] = priceMax;
    if (search != null && search.isNotEmpty) q['search'] = search;
    if (listingType != null && listingType.isNotEmpty) {
      q['listing_type'] = listingType;
    }
    if (ordering != null && ordering.isNotEmpty) q['ordering'] = ordering;
    if (createdAfter != null && createdAfter.isNotEmpty) {
      q['created_after'] = createdAfter;
    }
    if (createdBefore != null && createdBefore.isNotEmpty) {
      q['created_before'] = createdBefore;
    }
    if (hasParking != null) q['has_parking'] = hasParking;
    if (hasWifi != null) q['has_wifi'] = hasWifi;
    if (hasSecurity != null) q['has_security'] = hasSecurity;
    if (hasGenerator != null) q['has_generator'] = hasGenerator;
    if (isFurnished != null) q['is_furnished'] = isFurnished;
    if (hasElevator != null) q['has_elevator'] = hasElevator;
    if (petsAllowed != null) q['pets_allowed'] = petsAllowed;
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

  /// Hall rental listings (`HallRentalListView`); items are property detail JSON.
  Future<List<PropertySummary>> fetchHallRentals({
    String? city,
    String? subCity,
    String? hallType,
    int? capacityMin,
    int? capacityMax,
    double? pricePerHourMin,
    double? pricePerHourMax,
    bool? hasSoundSystem,
    bool? hasStage,
    bool? cateringAvailable,
    bool? isIndoor,
    String? ordering,
  }) async {
    final q = <String, dynamic>{};
    if (city != null && city.isNotEmpty) q['city'] = city;
    if (subCity != null && subCity.isNotEmpty) q['sub_city'] = subCity;
    if (hallType != null && hallType.isNotEmpty) q['hall_type'] = hallType;
    if (capacityMin != null) q['capacity_min'] = capacityMin;
    if (capacityMax != null) q['capacity_max'] = capacityMax;
    if (pricePerHourMin != null) q['price_per_hour_min'] = pricePerHourMin;
    if (pricePerHourMax != null) q['price_per_hour_max'] = pricePerHourMax;
    if (hasSoundSystem != null) q['has_sound_system'] = hasSoundSystem;
    if (hasStage != null) q['has_stage'] = hasStage;
    if (cateringAvailable != null) q['catering_available'] = cateringAvailable;
    if (isIndoor != null) q['is_indoor'] = isIndoor;
    if (ordering != null && ordering.isNotEmpty) q['ordering'] = ordering;
    try {
      final res = await _dio.get(
        '/api/properties/halls/',
        queryParameters: _withPageSize(q),
      );
      final list = _unwrapList(res.data);
      return list
          .map((e) => PropertySummary.fromDetailJson(e as Map<String, dynamic>))
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
    required String listingType,
    required int bathrooms,
    required String city,
    required String subCity,
    required String specificLocation,
    required Map<String, dynamic> amenities,
    int? floorNumber,
    int? shopClassCount,
    double? areaSqm,
    Map<String, dynamic>? hallDetail,
  }) async {
    final body = <String, dynamic>{
      'title': title,
      'description': description,
      'property_type': propertyType,
      'bedrooms': bedrooms,
      'bathrooms': bathrooms,
      'price_monthly': priceMonthly.toStringAsFixed(2),
      'price_currency': 'ETB',
      'listing_type': listingType,
      'location': {
        'city': city,
        'sub_city': subCity,
        'woreda': '',
        'kebele': '',
        'specific_location': specificLocation,
        'maps_url': '',
      },
      'amenities': amenities,
    };
    if (floorNumber != null) {
      body['floor_number'] = floorNumber;
    }
    if (shopClassCount != null) {
      body['shop_class_count'] = shopClassCount;
    }
    if (areaSqm != null) {
      body['area_sqm'] = areaSqm.toStringAsFixed(2);
    }
    if (hallDetail != null && propertyType == 'HALL_RENTAL') {
      body['hall_detail'] = hallDetail;
    }
    final res = await _dio.post('/api/properties/properties/', data: body);
    return res.data as Map<String, dynamic>;
  }

  /// Starts a server-side payment and returns `checkout_url` when the provider supports redirect.
  /// [paymentType] e.g. `LISTING_FEE`, `FEATURED_LISTING`; [paymentMethod] `CHAPA`, `TELEBIRR`, `STRIPE`.
  Future<Map<String, dynamic>> initiatePayment({
    required String paymentType,
    required double amount,
    required String paymentMethod,
    String currency = 'ETB',
    int? propertyId,
    int? hallBookingId,
    String description = '',
    String? phone,
    String? callbackUrl,
    String? returnUrl,
  }) async {
    final base = AppConfig.apiBaseUrl;
    final cb = callbackUrl ?? '$base/';
    final ret = returnUrl ?? '$base/';
    final res = await _dio.post(
      '/api/payments/initiate/',
      data: <String, dynamic>{
        'payment_type': paymentType,
        'amount': amount.toStringAsFixed(2),
        'currency': currency,
        'payment_method': paymentMethod,
        if (propertyId != null) 'property_id': propertyId,
        if (hallBookingId != null) 'hall_booking_id': hallBookingId,
        'description': description,
        'callback_url': cb,
        'return_url': ret,
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

  Future<void> uploadPropertyVideo({
    required String propertySlug,
    required String filePath,
  }) async {
    final name = filePath.split(RegExp(r'[/\\]')).last;
    final form = FormData.fromMap({
      'video': await MultipartFile.fromFile(filePath, filename: name),
    });
    await _dio.post(
      '/api/properties/properties/$propertySlug/videos/',
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

  Future<List<BookingItem>> fetchBookings({Map<String, dynamic>? query}) async {
    final res = await _dio.get(
      '/api/bookings/bookings/',
      queryParameters: _withPageSize(query),
    );
    return _unwrapMapList(res.data).map(BookingItem.fromJson).toList();
  }

  Future<List<BookingItem>> fetchPropertyOwnerBookings() async {
    final rows = await fetchBookings();
    return rows.where((b) => b.status == 'PENDING' || b.status == 'CONFIRMED').toList();
  }

  Future<Map<String, dynamic>> fetchAvailability({
    required int propertyId,
    int? year,
    int? month,
  }) async {
    final q = <String, dynamic>{};
    if (year != null) q['year'] = year;
    if (month != null) q['month'] = month;
    final res = await _dio.get(
      '/api/bookings/availability/$propertyId/',
      queryParameters: q,
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<Map<String, dynamic>>> fetchUnavailableDates({
    required int propertyId,
  }) async {
    final res = await _dio.get(
      '/api/bookings/unavailable-dates/',
      queryParameters: {'page_size': 200, 'property': propertyId},
    );
    return _unwrapMapList(res.data);
  }

  Future<Map<String, dynamic>> addUnavailableDate({
    required int propertyId,
    required String dateIso,
    String reason = '',
  }) async {
    final res = await _dio.post(
      '/api/bookings/unavailable-dates/',
      data: {'property': propertyId, 'date': dateIso, 'reason': reason},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> deleteUnavailableDate(int id) async {
    await _dio.delete('/api/bookings/unavailable-dates/$id/');
  }

  Future<BookingItem> createVisitBooking({
    required int propertyId,
    required DateTime visitDate,
    required String visitTime24h,
    String message = '',
  }) async {
    final res = await _dio.post(
      '/api/bookings/bookings/',
      data: {
        'property': propertyId,
        'booking_type': 'VISIT',
        'visit_date': visitDate.toIso8601String().split('T').first,
        'visit_time': visitTime24h,
        'message': message,
      },
    );
    return BookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<BookingItem> updateBookingStatus({
    required int bookingId,
    required String status,
    String ownerResponse = '',
  }) async {
    final res = await _dio.patch(
      '/api/bookings/bookings/$bookingId/update-status/',
      data: {
        'status': status,
        'landlord_response': ownerResponse,
      },
    );
    return BookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<BookingItem> cancelBooking(int bookingId) async {
    final res = await _dio.post('/api/bookings/bookings/$bookingId/cancel/');
    return BookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<List<HallBookingItem>> fetchHallBookings({Map<String, dynamic>? query}) async {
    final res = await _dio.get(
      '/api/bookings/hall-bookings/',
      queryParameters: _withPageSize(query),
    );
    return _unwrapMapList(res.data).map(HallBookingItem.fromJson).toList();
  }

  Future<HallBookingItem> createHallBooking({
    required int propertyId,
    required DateTime eventDate,
    DateTime? eventEndDate,
    String startTime24h = '09:00:00',
    String endTime24h = '17:00:00',
    int guestCount = 50,
    String eventType = 'Event',
    String specialRequests = '',
  }) async {
    final res = await _dio.post(
      '/api/bookings/hall-bookings/',
      data: {
        'property': propertyId,
        'event_date': eventDate.toIso8601String().split('T').first,
        'event_end_date': (eventEndDate ?? eventDate).toIso8601String().split('T').first,
        'start_time': startTime24h,
        'end_time': endTime24h,
        'guest_count': guestCount,
        'event_type': eventType,
        'special_requests': specialRequests,
      },
    );
    return HallBookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<HallBookingItem> updateHallBookingStatus({
    required int bookingId,
    required String status,
  }) async {
    final res = await _dio.patch(
      '/api/bookings/hall-bookings/$bookingId/update-status/',
      data: {'status': status},
    );
    return HallBookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<HallBookingItem> cancelHallBooking(int bookingId) async {
    final res = await _dio.post('/api/bookings/hall-bookings/$bookingId/cancel/');
    return HallBookingItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<List<PropertySummary>> fetchMyProperties() async {
    final res = await _dio.get(
      '/api/properties/my-properties/',
      queryParameters: const {'page_size': 100},
    );
    return _unwrapMapList(res.data).map(PropertySummary.fromJson).toList();
  }

  Future<Map<String, dynamic>> updateProperty({
    required String propertySlug,
    required Map<String, dynamic> payload,
  }) async {
    final res = await _dio.patch(
      '/api/properties/properties/$propertySlug/',
      data: payload,
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> publishProperty(String propertySlug) async {
    final res = await _dio.post('/api/properties/properties/$propertySlug/publish/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Aggregate neighborhood stats plus optional AI band (requires server-side keys).
  Future<Map<String, dynamic>> postPriceEstimate(Map<String, dynamic> body) async {
    final res = await _dio.post('/api/properties/price-estimate/', data: body);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<ListingPackageItem>> fetchListingPackages() async {

    final res = await _dio.get('/api/payments/listing-packages/');
    return _unwrapMapList(res.data).map(ListingPackageItem.fromJson).toList();
  }

  Future<Map<String, dynamic>> fetchListingSlotSummary() async {
    final res = await _dio.get('/api/payments/listing-packages/slots/summary/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<ListingPackagePurchaseItem>> fetchMyListingPackagePurchases() async {
    final res = await _dio.get('/api/payments/listing-packages/my-purchases/');
    return _unwrapMapList(res.data)
        .map(ListingPackagePurchaseItem.fromJson)
        .toList();
  }

  Future<ListingPackagePurchaseItem?> fetchMyActiveListingPackagePurchase() async {
    final res = await _dio.get('/api/payments/listing-packages/my-active/');
    final data = res.data;
    if (data is! Map) throw ApiException('Unexpected active purchase response');
    final ap = data['active_purchase'];
    if (ap == null) return null;
    if (ap is! Map) throw ApiException('Unexpected active purchase payload');
    return ListingPackagePurchaseItem.fromJson(Map<String, dynamic>.from(ap));
  }

  Future<Map<String, dynamic>> initiateListingPackagePurchase({
    required int packageId,
    String paymentMethod = 'CHAPA',
    String? returnUrl,
    String? callbackUrl,
    String? phone,
  }) async {
    final res = await _dio.post(
      '/api/payments/listing-packages/$packageId/purchase/',
      data: {
        'payment_method': paymentMethod,
        if (returnUrl != null) 'return_url': returnUrl,
        if (callbackUrl != null) 'callback_url': callbackUrl,
        if (phone != null) 'phone': phone,
      },
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> verifyPayment({
    required String transactionId,
    required String paymentMethod,
  }) async {
    final res = await _dio.post(
      '/api/payments/verify/',
      data: {
        'transaction_id': transactionId,
        'payment_method': paymentMethod,
      },
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<Map<String, dynamic>>> fetchPaymentHistory() async {
    final res = await _dio.get(
      '/api/payments/history/',
      queryParameters: const {'page_size': 100},
    );
    return _unwrapMapList(res.data);
  }

  Future<List<ReviewItem>> fetchPropertyReviews(int propertyId) async {
    final res = await _dio.get(
      '/api/reviews/reviews/',
      queryParameters: _withPageSize({'property': propertyId}),
    );
    return _unwrapMapList(res.data).map(ReviewItem.fromJson).toList();
  }

  Future<List<ReviewItem>> fetchMyReviews() async {
    final res = await _dio.get(
      '/api/reviews/reviews/',
      queryParameters: _withPageSize({'mine': 1}),
    );
    return _unwrapMapList(res.data).map(ReviewItem.fromJson).toList();
  }

  Future<ReviewItem> createReview({
    required String reviewType,
    required int rating,
    required String title,
    required String comment,
    int? propertyId,
    int? reviewedUserId,
  }) async {
    final res = await _dio.post(
      '/api/reviews/reviews/',
      data: {
        'review_type': reviewType,
        'rating': rating,
        'title': title,
        'comment': comment,
        if (propertyId != null) 'property': propertyId,
        if (reviewedUserId != null) 'reviewed_user': reviewedUserId,
      },
    );
    return ReviewItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<ReviewItem> respondToReview({
    required int reviewId,
    required String comment,
  }) async {
    final res = await _dio.post(
      '/api/reviews/reviews/$reviewId/respond/',
      data: {'comment': comment},
    );
    final responseMap = Map<String, dynamic>.from(res.data as Map);
    return ReviewItem(
      id: reviewId,
      reviewType: '',
      rating: 0,
      title: '',
      comment: '',
      createdAt: DateTime.now(),
      responseComment: responseMap['comment']?.toString(),
    );
  }

  Future<ReviewSummary> fetchPropertyReviewSummary(int propertyId) async {
    final res = await _dio.get('/api/reviews/properties/$propertyId/reviews/summary/');
    return ReviewSummary.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<List<LocationAlertItem>> fetchLocationAlerts() async {
    final res = await _dio.get('/api/notifications/location-alerts/');
    return _unwrapMapList(res.data).map(LocationAlertItem.fromJson).toList();
  }

  Future<LocationAlertItem> createLocationAlert({
    required String city,
    String subCity = '',
    String label = '',
    String propertyType = '',
    double? latitude,
    double? longitude,
    int radiusKm = 5,
  }) async {
    final res = await _dio.post(
      '/api/notifications/location-alerts/',
      data: {
        'city': city,
        'sub_city': subCity,
        'label': label,
        'property_type': propertyType,
        'latitude': latitude,
        'longitude': longitude,
        'radius_km': radiusKm,
        'is_active': true,
      },
    );
    return LocationAlertItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<LocationAlertItem> updateLocationAlert({
    required int id,
    required Map<String, dynamic> payload,
  }) async {
    final res = await _dio.patch('/api/notifications/location-alerts/$id/', data: payload);
    return LocationAlertItem.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<void> deleteLocationAlert(int id) async {
    await _dio.delete('/api/notifications/location-alerts/$id/');
  }

  Future<Map<String, dynamic>> fetchNotificationPreferences() async {
    final res = await _dio.get('/api/notifications/preferences/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> updateNotificationPreferences(
    Map<String, dynamic> payload,
  ) async {
    final res = await _dio.patch('/api/notifications/preferences/', data: payload);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> registerPushToken({
    required String token,
    required String platform,
  }) async {
    await _dio.post(
      '/api/notifications/push-token/',
      data: {'token': token, 'platform': platform},
    );
  }

  Future<void> unregisterPushToken(String token) async {
    await _dio.delete(
      '/api/notifications/push-token/',
      data: {'token': token},
    );
  }

  Future<Map<String, dynamic>> fetchAdminDashboard({
    String? startDate,
    String? endDate,
  }) async {
    final q = <String, dynamic>{};
    if (startDate != null) q['start_date'] = startDate;
    if (endDate != null) q['end_date'] = endDate;
    final res = await _dio.get('/api/analytics/dashboard/', queryParameters: q);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> fetchAdminUsersAnalytics() async {
    final res = await _dio.get('/api/analytics/users/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> fetchAdminListingsAnalytics() async {
    final res = await _dio.get('/api/analytics/listings/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> fetchAdminPopularAreasAnalytics() async {
    final res = await _dio.get('/api/analytics/popular-areas/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Platform admin / staff: all listings (respects `PropertyFilter` query params).
  Future<List<PropertySummary>> fetchAdminPropertyList({
    String? search,
    bool? isVerified,
    String? propertyType,
    String? city,
  }) async {
    final q = <String, dynamic>{};
    if (search != null && search.isNotEmpty) q['search'] = search;
    if (isVerified != null) q['is_verified'] = isVerified;
    if (propertyType != null && propertyType.isNotEmpty) {
      q['property_type'] = propertyType;
    }
    if (city != null && city.isNotEmpty) q['city'] = city;
    final res = await _dio.get(
      '/api/properties/properties/',
      queryParameters: _withPageSize(q),
    );
    final list = _unwrapList(res.data);
    return list
        .map((e) => PropertySummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> adminVerifyProperty(int propertyId) async {
    final res = await _dio.post('/api/properties/properties/admin/$propertyId/verify/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> adminRejectProperty(
    int propertyId, {
    String reason = '',
  }) async {
    final res = await _dio.post(
      '/api/properties/properties/admin/$propertyId/reject/',
      data: {'reason': reason},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<Map<String, dynamic>>> fetchAdminUsersDirectory() async {
    final res = await _dio.get('/api/accounts/admin/users/');
    return _unwrapMapList(res.data);
  }

  Future<Map<String, dynamic>> adminSetUserActive(int userId, bool isActive) async {
    final res = await _dio.patch(
      '/api/accounts/admin/users/$userId/status/',
      data: {'is_active': isActive},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> fetchOwnerListingsEngagement({
    String? startDate,
    String? endDate,
  }) async {
    final q = <String, dynamic>{};
    if (startDate != null && startDate.isNotEmpty) q['start_date'] = startDate;
    if (endDate != null && endDate.isNotEmpty) q['end_date'] = endDate;
    try {
      final res = await _dio.get(
        '/api/analytics/owner/listings/engagement/',
        queryParameters: q,
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException(_msgFromDio(e), statusCode: e.response?.statusCode);
    }
  }
}

// ── Auth state (lives next to API to avoid circular imports) ─────────────────

enum AuthPhase { bootstrapping, guest, authenticated }

class AuthState {
  const AuthState._(this.phase, this.user);
  const AuthState.bootstrapping() : this._(AuthPhase.bootstrapping, null);
  const AuthState.guest() : this._(AuthPhase.guest, null);
  const AuthState.authenticated(BetNetUser user)
      : this._(AuthPhase.authenticated, user);

  final AuthPhase phase;
  final BetNetUser? user;

  bool get isAuthenticated =>
      phase == AuthPhase.authenticated && user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this.ref)
      : super(const AuthState.bootstrapping()) {
    _api = BetNetApi(
      ref.read(tokenStorageProvider),
      onSessionExpired: () {
        state = const AuthState.guest();
      },
    );
    _bootstrap();
  }

  final Ref ref;
  late final BetNetApi _api;
  BetNetApi get api => _api;

  Future<void> setApiBaseUrlOverride(String baseUrl) async {
    await AppConfig.setDebugApiBaseOverride(baseUrl);
    _api.setBaseUrl(AppConfig.apiBaseUrl);
  }

  Future<void> clearApiBaseUrlOverride() async {
    await AppConfig.clearDebugApiBaseOverride();
    _api.setBaseUrl(AppConfig.apiBaseUrl);
  }

  Future<void> _bootstrap() async {
    try {
      final user = await _api.restoreUser();
      state = user != null
          ? AuthState.authenticated(user)
          : const AuthState.guest();
    } catch (e, st) {
      debugPrint('BetNet auth bootstrap failed (starting guest): $e\n$st');
      AppDebug.log('Auth bootstrap failed (starting guest): $e\n$st');
      state = const AuthState.guest();
    } finally {
      goRouterRefresh.refresh();
    }
  }

  Future<void> login(String identifier, String password) async {
    final r = await _api.login(identifier: identifier, password: password);
    state = AuthState.authenticated(r.user);
    goRouterRefresh.refresh();
  }

  Future<void> completePasswordReset({
    required String phoneE164,
    required String otp,
    required String newPassword,
    required String newPasswordConfirm,
  }) async {
    final r = await _api.confirmPasswordReset(
      phoneE164: phoneE164,
      otp: otp,
      newPassword: newPassword,
      newPasswordConfirm: newPasswordConfirm,
    );
    state = AuthState.authenticated(r.user);
    goRouterRefresh.refresh();
  }

  Future<void> verifyOtp({
    required String phoneE164,
    required String otp,
  }) async {
    final u = await _api.verifyOtpAndRestoreSession(phoneE164: phoneE164, otp: otp);
    state = AuthState.authenticated(u);
    goRouterRefresh.refresh();
  }

  Future<void> refreshProfile() async {
    final u = await _api.restoreUser();
    if (u != null) state = AuthState.authenticated(u);
  }

  Future<void> switchWorkspace(String mode) async {
    final u = await _api.switchWorkspace(mode);
    state = AuthState.authenticated(u);
    goRouterRefresh.refresh();
  }

  void replaceUser(BetNetUser user) {
    state = AuthState.authenticated(user);
    goRouterRefresh.refresh();
  }

  Future<void> register({
    required String phoneE164,
    required String password,
    required String passwordConfirm,
    required String firstName,
    required String lastName,
    required String role,
    required String email,
  }) async {
    final r = await _api.register(
      phoneE164: phoneE164,
      password: password,
      passwordConfirm: passwordConfirm,
      firstName: firstName,
      lastName: lastName,
      role: role,
      email: email,
    );
    state = AuthState.authenticated(r.user);
    goRouterRefresh.refresh();
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AuthState.guest();
    goRouterRefresh.refresh();
  }
}
