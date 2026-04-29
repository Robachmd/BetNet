import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/chat.dart';
import '../../services/betnet_api.dart';
import 'chat_thread_screen.dart';

final conversationsProvider =
    FutureProvider.autoDispose<List<ConversationListItem>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return [];
  return ref.watch(betNetApiProvider).fetchConversations();
});

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Messages')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Sign in to message property owners.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/login'),
                child: const Text('Log in'),
              ),
            ],
          ),
        ),
      );
    }

    final async = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Text('No conversations yet.\nOpen a listing and tap Message.'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(conversationsProvider),
            child: ListView.separated(
              itemCount: list.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final c = list[i];
                final name = c.otherParticipant?.displayName ?? 'User';
                return ListTile(
                  title: Text(name),
                  subtitle: Text(
                    c.lastMessagePreview ?? (c.propertyTitle ?? 'General'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: c.unreadCount > 0
                      ? Badge(label: Text('${c.unreadCount}'))
                      : null,
                  onTap: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => ChatThreadScreen(
                          conversationId: c.id,
                          title: name,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
