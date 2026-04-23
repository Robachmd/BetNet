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
