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
    this.landlordEligible = false,
    this.activeAppMode = 'RENTER',
    this.phoneVerified = false,
    this.idVerified = false,
    this.preferredLanguage = 'EN',
    this.city,
    this.subCity,
    this.bio,
    this.ownerType,
  });

  final int id;
  final String phoneNumber;
  final String? email;
  final String firstName;
  final String lastName;
  final String role;
  final String? profileImage;
  final bool landlordEligible;
  /// RENTER | LANDLORD (API uses LANDLORD for property owner role)
  final String activeAppMode;
  final bool phoneVerified;
  final bool idVerified;
  final String preferredLanguage;
  final String? city;
  final String? subCity;
  final String? bio;
  final String? ownerType;

  String get displayName =>
      '$firstName $lastName'.trim().isEmpty ? phoneNumber : '$firstName $lastName'.trim();

  bool get isPropertyOwner => role == 'LANDLORD';
  bool get isLandlord => isPropertyOwner;
  bool get isAdmin => role == 'ADMIN';
  bool get canAccessPropertyOwnerTools => isPropertyOwner || landlordEligible;

  BetNetUser copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? profileImage,
    bool? landlordEligible,
    String? activeAppMode,
    bool? phoneVerified,
    String? preferredLanguage,
    String? city,
    String? subCity,
    String? bio,
    String? ownerType,
  }) {
    return BetNetUser(
      id: id,
      phoneNumber: phoneNumber,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role,
      profileImage: profileImage ?? this.profileImage,
      landlordEligible: landlordEligible ?? this.landlordEligible,
      activeAppMode: activeAppMode ?? this.activeAppMode,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      idVerified: idVerified,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      city: city ?? this.city,
      subCity: subCity ?? this.subCity,
      bio: bio ?? this.bio,
      ownerType: ownerType ?? this.ownerType,
    );
  }

  factory BetNetUser.fromJson(Map<String, dynamic> j) {
    return BetNetUser(
      id: j['id'] as int,
      phoneNumber: '${j['phone_number'] ?? ''}',
      email: j['email'] as String?,
      firstName: '${j['first_name'] ?? ''}',
      lastName: '${j['last_name'] ?? ''}',
      role: '${j['role'] ?? 'RENTER'}',
      profileImage: j['profile_image'] as String?,
      landlordEligible: j['landlord_eligible'] as bool? ?? false,
      activeAppMode: '${j['active_app_mode'] ?? 'RENTER'}',
      phoneVerified: j['phone_verified'] as bool? ?? false,
      idVerified: j['id_verified'] as bool? ?? false,
      preferredLanguage: '${j['preferred_language'] ?? 'EN'}',
      city: j['city'] as String?,
      subCity: j['sub_city'] as String?,
      bio: j['bio'] as String?,
      ownerType: j['owner_type'] as String?,
    );
  }
}
