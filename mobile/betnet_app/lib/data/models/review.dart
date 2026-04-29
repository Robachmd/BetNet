class ReviewItem {
  ReviewItem({
    required this.id,
    required this.reviewType,
    required this.rating,
    required this.title,
    required this.comment,
    required this.createdAt,
    this.propertyId,
    this.reviewerName,
    this.responseComment,
  });

  final int id;
  final String reviewType;
  final int rating;
  final String title;
  final String comment;
  final DateTime createdAt;
  final int? propertyId;
  final String? reviewerName;
  final String? responseComment;

  factory ReviewItem.fromJson(Map<String, dynamic> j) {
    final response = j['response'] as Map<String, dynamic>?;
    return ReviewItem(
      id: j['id'] as int,
      reviewType: '${j['review_type'] ?? ''}',
      rating: (j['rating'] as num?)?.toInt() ?? 0,
      title: '${j['title'] ?? ''}',
      comment: '${j['comment'] ?? ''}',
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}') ?? DateTime.now(),
      propertyId: j['property'] as int?,
      reviewerName: j['reviewer_name'] != null ? '${j['reviewer_name']}' : null,
      responseComment: response?['comment'] != null ? '${response!['comment']}' : null,
    );
  }
}

class ReviewSummary {
  ReviewSummary({
    required this.averageRating,
    required this.totalReviews,
    required this.ratingDistribution,
  });

  final double averageRating;
  final int totalReviews;
  final Map<String, int> ratingDistribution;

  factory ReviewSummary.fromJson(Map<String, dynamic> j) {
    final rawDist = (j['rating_distribution'] as Map<String, dynamic>?) ?? {};
    return ReviewSummary(
      averageRating: (j['average_rating'] as num?)?.toDouble() ?? 0,
      totalReviews: (j['total_reviews'] as num?)?.toInt() ?? 0,
      ratingDistribution: rawDist.map(
        (k, v) => MapEntry(k, (v as num?)?.toInt() ?? 0),
      ),
    );
  }
}
