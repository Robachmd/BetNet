/// Logged-in user from `/api/accounts/profile/` or login/register payloads.
class BetNetUser {
  BetNetUser({
    required this.id,
    required this.phoneNumber,
    this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.profileImage,
  });

  final int id;
  final String phoneNumber;
  final String? email;
  final String firstName;
  final String lastName;
  final String role;
  final String? profileImage;

  String get displayName =>
      '$firstName $lastName'.trim().isEmpty ? phoneNumber : '$firstName $lastName'.trim();

  bool get isLandlord => role == 'LANDLORD';

  factory BetNetUser.fromJson(Map<String, dynamic> j) {
    return BetNetUser(
      id: j['id'] as int,
      phoneNumber: '${j['phone_number'] ?? ''}',
      email: j['email'] as String?,
      firstName: '${j['first_name'] ?? ''}',
      lastName: '${j['last_name'] ?? ''}',
      role: '${j['role'] ?? 'RENTER'}',
      profileImage: j['profile_image'] as String?,
    );
  }
}
