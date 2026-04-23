import 'config.dart';

/// Django may return absolute URLs or `/media/...` paths. Normalize for [Image.network].
String resolveMediaUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  final base = AppConfig.apiBaseUrl;
  if (path.startsWith('/')) return '$base$path';
  return '$base/$path';
}
