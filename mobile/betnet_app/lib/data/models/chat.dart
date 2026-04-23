import '../../core/media_url.dart';
import 'user.dart';

class ConversationListItem {
  ConversationListItem({
    required this.id,
    this.otherParticipant,
    this.propertyTitle,
    this.lastMessagePreview,
    required this.unreadCount,
  });

  final int id;
  final BetNetUser? otherParticipant;
  final String? propertyTitle;
  final String? lastMessagePreview;
  final int unreadCount;

  factory ConversationListItem.fromJson(Map<String, dynamic> j) {
    final other = j['other_participant'] as Map<String, dynamic>?;
    final prop = j['property'] as Map<String, dynamic>?;
    final last = j['last_message'] as Map<String, dynamic>?;
    return ConversationListItem(
      id: j['id'] as int,
      otherParticipant:
          other != null ? BetNetUser.fromJson(_participantToUserJson(other)) : null,
      propertyTitle: prop?['title'] as String?,
      lastMessagePreview: last?['content'] as String?,
      unreadCount: j['unread_count'] as int? ?? 0,
    );
  }

  /// Chat API returns participant shape; map onto [BetNetUser] fields we need.
  static Map<String, dynamic> _participantToUserJson(Map<String, dynamic> p) {
    return {
      'id': p['id'],
      'phone_number': p['phone_number'] ?? '',
      'email': null,
      'first_name': p['first_name'] ?? '',
      'last_name': p['last_name'] ?? '',
      'role': 'RENTER',
      'profile_image': p['profile_image'],
    };
  }
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.content,
    required this.createdAt,
    required this.isOwn,
    this.senderName,
  });

  final int id;
  final String content;
  final DateTime createdAt;
  final bool isOwn;
  final String? senderName;

  factory ChatMessage.fromJson(Map<String, dynamic> j) {
    final sender = j['sender'] as Map<String, dynamic>?;
    return ChatMessage(
      id: j['id'] as int,
      content: j['content'] as String? ?? '',
      createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ??
          DateTime.now(),
      isOwn: j['is_own'] as bool? ?? false,
      senderName: sender != null
          ? '${sender['first_name'] ?? ''} ${sender['last_name'] ?? ''}'.trim()
          : null,
    );
  }
}

String? profileImageUrlFromParticipant(Map<String, dynamic>? p) {
  if (p == null) return null;
  return resolveMediaUrl(p['profile_image'] as String?);
}
