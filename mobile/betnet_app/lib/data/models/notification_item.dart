class AppNotification {
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.data = const {},
  });

  final int id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic> data;

  factory AppNotification.fromJson(Map<String, dynamic> j) {
    return AppNotification(
      id: j['id'] as int,
      type: j['notification_type'] as String? ?? '',
      title: j['title'] as String? ?? '',
      message: j['message'] as String? ?? '',
      isRead: j['is_read'] as bool? ?? false,
      createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ??
          DateTime.now(),
      data: j['data'] is Map
          ? Map<String, dynamic>.from(j['data'] as Map)
          : const {},
    );
  }
}
