/// Matches backend `Property.PropertyType` values that may have a floor
/// (see `properties.serializers._FLOOR_RELEVANT_PROPERTY_TYPES` and
/// `betnet.views._floor_number_from_post`).
const Set<String> kFloorRelevantPropertyTypes = {
  'APARTMENT',
  'CONDOMINIUM',
  'REAL_ESTATE',
  'BUSINESS_SHOP',
};

bool isFloorRelevantPropertyType(String? apiType) {
  if (apiType == null || apiType.isEmpty) return false;
  return kFloorRelevantPropertyTypes.contains(apiType.toUpperCase());
}

int? parseFloorNumberFromJson(dynamic raw) {
  if (raw == null) return null;
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  return int.tryParse('$raw');
}
