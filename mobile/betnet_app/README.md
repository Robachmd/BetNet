# BetNet (Flutter)

Cross-platform mobile client for the BetNet Django API: browse properties in Ethiopia, save favorites, chat with owners, manage alerts, and post listings.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable, 3.22+ recommended)
- Android Studio / Xcode for device emulators
- Your BetNet backend running and reachable from the phone or emulator (see networking below)

## One-time project setup

From this folder:

```bash
cd mobile/betnet_app
flutter pub get
```

If `android/` or `ios/` folders are missing (for example you only copied `lib/` and `pubspec.yaml`), generate them:

```bash
flutter create . --project-name betnet_app
```

This keeps your existing `lib/` code and fills in platform scaffolding.

## Point the app at your API

By default, debug builds use `http://127.0.0.1:8000`. That works for **desktop** or **iOS simulator** talking to Django on the same machine. It does **not** work for a physical phone or Android emulator.

Use a compile-time override:

```bash
# Android emulator → host machine Django
flutter run --dart-define=BETNET_API_BASE=http://10.0.2.2:8000

# Physical phone on same Wi‑Fi (use your PC LAN IP)
flutter run --dart-define=BETNET_API_BASE=http://192.168.1.50:8000
```

Production:

```bash
flutter build apk --dart-define=BETNET_API_BASE=https://api.yourdomain.com
```

### Django checklist for mobile

1. **`ALLOWED_HOSTS`** must include the host/IP clients use (or `*` in dev only).
2. **HTTP on Android 9+**: for `http://` dev URLs, set `android:usesCleartextTraffic="true"` on the `<application>` tag in `android/app/src/debug/AndroidManifest.xml` (Flutter can merge debug manifests).
3. **Auth**: the API uses **JWT** (`Authorization: Bearer <access>`). Refresh is supported at `POST /api/accounts/token/refresh/` with body `{"refresh":"..."}` (added for this app).
4. **Phone numbers**: register/login expect Ethiopian numbers in **E.164** (the app normalizes common local formats to `+251…`).

## Architecture (lib/)

| Area | Role |
|------|------|
| `core/config.dart` | API base URL, cache TTL, poll interval |
| `services/betnet_api.dart` | Dio client, JWT refresh interceptor, REST calls, `AuthNotifier` |
| `services/token_storage.dart` | `flutter_secure_storage` for access/refresh tokens |
| `services/listings_cache.dart` | Hive-backed last good listing response (offline) |
| `providers/` | Riverpod: filters, listings (network + cache fallback) |
| `ui/screens/` | Browse, filters, detail, auth, chat, notifications, profile, add listing |
| `utils/phone_et.dart` | Normalizes `09…` / `9…` → `+251…` |

**State management**: [Riverpod](https://pub.dev/packages/flutter_riverpod) (`ConsumerWidget` / `ConsumerStatefulWidget`).

**Images**: [cached_network_image](https://pub.dev/packages/cached_network_image) with `memCacheWidth` to limit decoded size on slow networks and low-RAM phones.

**Offline**: last successful browse list is stored in Hive; when offline or on error, the UI can show cached rows with a “Retry” / stale banner.

**Notifications**: the shell polls `GET /api/notifications/unread-count/` on a timer. **Firebase Cloud Messaging** is not wired; for true push you would add `firebase_messaging`, store device tokens in Django, and enqueue notifications when `NEW_LISTING` (or other) events fire.

## Useful API paths (reference)

- `POST /api/accounts/register/`, `POST /api/accounts/login/`, `POST /api/accounts/logout/`
- `POST /api/accounts/token/refresh/`
- `GET /api/properties/properties/?city=&price_min=&price_max=&property_type=&bedrooms=&search=`
- `GET /api/properties/properties/<slug>/`
- `GET|POST /api/properties/favorites/`, `DELETE /api/properties/favorites/<id>/`
- `POST /api/properties/properties/<slug>/images/` (multipart `image`, `is_primary`)
- `GET|POST /api/chat/conversations/`, messages under `.../conversations/<id>/messages/`
- `GET /api/notifications/`, `POST /api/notifications/mark-read/`

## iOS photo picker

If `image_picker` asks for permissions, add the usual keys to `ios/Runner/Info.plist`:

- `NSPhotoLibraryUsageDescription`
- `NSCameraUsageDescription` (if you later add camera capture)

## Running tests

```bash
flutter test
```

(Add widget/integration tests as you harden releases.)

## What we improved on the backend for mobile

1. **`POST /api/accounts/token/refresh/`** — standard SimpleJWT refresh for 30-minute access tokens.
2. **`favorite_id`** on property list/detail serializers — lets the app remove a favorite without guessing the favorite row id.
3. **`id` and `slug`** on `PropertyCreateUpdateSerializer` responses — so after `POST` create, the client can upload images immediately.

---

For questions about the Django project itself, see the main repo `README` and `backend/` settings.
