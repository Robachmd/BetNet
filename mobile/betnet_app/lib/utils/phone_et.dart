/// Normalizes common Ethiopian mobile input to E.164 for the Django API (`+251...`).
String normalizeEthiopianPhone(String raw) {
  var s = raw.trim().replaceAll(RegExp(r'[\s\-]'), '');
  if (s.isEmpty) return s;
  if (s.startsWith('+251')) return s;
  if (s.startsWith('251') && s.length >= 12) return '+$s';
  if (s.startsWith('0') && s.length >= 10) {
    return '+251${s.substring(1)}';
  }
  if (RegExp(r'^\d{9}$').hasMatch(s)) {
    return '+251$s';
  }
  if (!s.startsWith('+')) {
    return '+$s';
  }
  return s;
}

final RegExp _ethiopianMobileE164 = RegExp(r'^\+251[79]\d{8}$');

/// Validates Ethiopian mobile numbers for both major providers:
/// - Ethio Telecom: 09XXXXXXXX
/// - Safaricom Ethiopia: 07XXXXXXXX
/// Also accepts international forms: +2519XXXXXXXX / +2517XXXXXXXX.
String? validateEthiopianMobile(String raw) {
  final normalized = normalizeEthiopianPhone(raw);
  if (normalized.isEmpty) {
    return 'Mobile number is required.';
  }
  if (!_ethiopianMobileE164.hasMatch(normalized)) {
    return 'Enter a valid Ethiopian mobile number: 09..., 07..., +2519..., or +2517....';
  }
  return null;
}
