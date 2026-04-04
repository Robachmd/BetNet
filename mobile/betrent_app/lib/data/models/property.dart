import '../../core/media_url.dart';

class PropertySummary {
  PropertySummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.propertyType,
    this.bedrooms,
    required this.priceMonthly,
    required this.priceCurrency,
    required this.city,
    this.subCity,
    this.specificLocation,
    this.primaryImageUrl,
    required this.isAvailable,
    required this.isFavorited,
    this.favoriteId,
    this.createdAt,
  });

  final int id;
  final String slug;
  final String title;
  final String propertyType;
  final String? bedrooms;
  final String priceMonthly;
  final String priceCurrency;
  final String city;
  final String? subCity;
  final String? specificLocation;
  final String? primaryImageUrl;
  final bool isAvailable;
  final bool isFavorited;
  final int? favoriteId;
  final DateTime? createdAt;

  String get locationLine {
    final parts = [city, if (subCity != null && subCity!.isNotEmpty) subCity!];
    return parts.join(', ');
  }

  String get resolvedImage => resolveMediaUrl(primaryImageUrl);

  factory PropertySummary.fromJson(Map<String, dynamic> j) {
    return PropertySummary(
      id: j['id'] as int,
      slug: j['slug'] as String,
      title: j['title'] as String,
      propertyType: j['property_type'] as String? ?? '',
      bedrooms: j['bedrooms'] as String?,
      priceMonthly: '${j['price_monthly']}',
      priceCurrency: j['price_currency'] as String? ?? 'ETB',
      city: j['city'] as String? ?? '',
      subCity: j['sub_city'] as String?,
      specificLocation: j['specific_location'] as String?,
      primaryImageUrl: j['primary_image'] as String?,
      isAvailable: j['is_available'] as bool? ?? true,
      isFavorited: j['is_favorited'] as bool? ?? false,
      favoriteId: j['favorite_id'] as int?,
      createdAt: j['created_at'] != null
          ? DateTime.tryParse(j['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'title': title,
        'property_type': propertyType,
        'bedrooms': bedrooms,
        'price_monthly': priceMonthly,
        'price_currency': priceCurrency,
        'city': city,
        'sub_city': subCity,
        'specific_location': specificLocation,
        'primary_image': primaryImageUrl,
        'is_available': isAvailable,
        'is_favorited': isFavorited,
        'favorite_id': favoriteId,
        'created_at': createdAt?.toIso8601String(),
      };

  PropertySummary copyWith({
    bool? isFavorited,
    int? favoriteId,
  }) {
    return PropertySummary(
      id: id,
      slug: slug,
      title: title,
      propertyType: propertyType,
      bedrooms: bedrooms,
      priceMonthly: priceMonthly,
      priceCurrency: priceCurrency,
      city: city,
      subCity: subCity,
      specificLocation: specificLocation,
      primaryImageUrl: primaryImageUrl,
      isAvailable: isAvailable,
      isFavorited: isFavorited ?? this.isFavorited,
      favoriteId: favoriteId ?? this.favoriteId,
      createdAt: createdAt,
    );
  }
}

class PropertyOwner {
  PropertyOwner({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.phoneNumber,
  });

  final int id;
  final String firstName;
  final String lastName;
  final String? phoneNumber;

  factory PropertyOwner.fromJson(Map<String, dynamic> j) {
    return PropertyOwner(
      id: j['id'] as int,
      firstName: '${j['first_name'] ?? ''}',
      lastName: '${j['last_name'] ?? ''}',
      phoneNumber: j['phone_number'] != null ? '${j['phone_number']}' : null,
    );
  }
}

class PropertyImage {
  PropertyImage({
    required this.id,
    required this.imageUrl,
    required this.isPrimary,
  });

  final int id;
  final String imageUrl;
  final bool isPrimary;

  String get resolvedUrl => resolveMediaUrl(imageUrl);

  factory PropertyImage.fromJson(Map<String, dynamic> j) {
    return PropertyImage(
      id: j['id'] as int,
      imageUrl: j['image'] as String? ?? '',
      isPrimary: j['is_primary'] as bool? ?? false,
    );
  }
}

class PropertyDetail {
  PropertyDetail({
    required this.summary,
    required this.description,
    required this.images,
    required this.owner,
    this.mapsUrl,
  });

  final PropertySummary summary;
  final String description;
  final List<PropertyImage> images;
  final PropertyOwner owner;
  final String? mapsUrl;

  factory PropertyDetail.fromJson(Map<String, dynamic> j) {
    final loc = j['location'] as Map<String, dynamic>?;
    final summary = PropertySummary(
      id: j['id'] as int,
      slug: j['slug'] as String,
      title: j['title'] as String,
      propertyType: j['property_type'] as String? ?? '',
      bedrooms: j['bedrooms'] as String?,
      priceMonthly: '${j['price_monthly']}',
      priceCurrency: j['price_currency'] as String? ?? 'ETB',
      city: loc?['city'] as String? ?? '',
      subCity: loc?['sub_city'] as String?,
      specificLocation: loc?['specific_location'] as String?,
      primaryImageUrl: null,
      isAvailable: j['is_available'] as bool? ?? true,
      isFavorited: j['is_favorited'] as bool? ?? false,
      favoriteId: j['favorite_id'] as int?,
      createdAt: j['created_at'] != null
          ? DateTime.tryParse(j['created_at'] as String)
          : null,
    );
    final imgs = (j['images'] as List<dynamic>? ?? [])
        .map((e) => PropertyImage.fromJson(e as Map<String, dynamic>))
        .toList();
    final thumb = imgs.isNotEmpty ? imgs.first.imageUrl : null;
    final summaryWithThumb = PropertySummary(
      id: summary.id,
      slug: summary.slug,
      title: summary.title,
      propertyType: summary.propertyType,
      bedrooms: summary.bedrooms,
      priceMonthly: summary.priceMonthly,
      priceCurrency: summary.priceCurrency,
      city: summary.city,
      subCity: summary.subCity,
      specificLocation: summary.specificLocation,
      primaryImageUrl: thumb,
      isAvailable: summary.isAvailable,
      isFavorited: summary.isFavorited,
      favoriteId: summary.favoriteId,
      createdAt: summary.createdAt,
    );
    return PropertyDetail(
      summary: summaryWithThumb,
      description: j['description'] as String? ?? '',
      images: imgs,
      owner: PropertyOwner.fromJson(j['owner'] as Map<String, dynamic>),
      mapsUrl: loc?['maps_url'] as String?,
    );
  }
}
