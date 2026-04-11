import 'package:url_launcher/url_launcher.dart';

/// Opens a payment provider URL (Chapa, Telebirr web checkout, etc.) outside the app
/// so Android/iOS can hand off to **Telebirr, CBE Birr, Awash**, or other bank apps
/// when the gateway redirects with app deep links. In-app WebView would block that.
Future<bool> openPaymentCheckoutUrl(String rawUrl) async {
  final trimmed = rawUrl.trim();
  if (trimmed.isEmpty) return false;
  final uri = Uri.parse(trimmed);

  Future<bool> tryLaunch(LaunchMode mode) async {
    return launchUrl(uri, mode: mode);
  }

  try {
    if (await canLaunchUrl(uri)) {
      return await tryLaunch(LaunchMode.externalApplication);
    }
  } catch (_) {
    // canLaunchUrl can be unreliable on some Android versions; still try launch.
  }

  try {
    return await tryLaunch(LaunchMode.externalApplication);
  } catch (_) {
    try {
      return await tryLaunch(LaunchMode.platformDefault);
    } catch (_) {
      return false;
    }
  }
}
