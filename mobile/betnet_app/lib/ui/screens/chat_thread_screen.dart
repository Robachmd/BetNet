import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';

import '../../data/models/chat.dart';
import '../../core/config.dart';
import '../../services/betnet_api.dart';
import '../../services/chat_realtime_service.dart';

final messagesProvider = FutureProvider.autoDispose
    .family<List<ChatMessage>, int>((ref, conversationId) async {
  return ref.watch(betNetApiProvider).fetchMessages(conversationId);
});

class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({
    super.key,
    required this.conversationId,
    required this.title,
  });

  final int conversationId;
  final String title;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final _text = TextEditingController();
  bool _sending = false;
  bool _realtimeConnected = false;
  Timer? _fallbackPoll;

  @override
  void dispose() {
    _fallbackPoll?.cancel();
    ref.read(chatRealtimeServiceProvider).disconnect();
    _text.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _setupRealtime());
  }

  Future<void> _setupRealtime() async {
    if (!AppConfig.enableRealtimeChat) {
      _startFallbackPolling();
      return;
    }
    await ref.read(chatRealtimeServiceProvider).connect(
      conversationId: widget.conversationId,
      onMessage: (_) {
        if (!mounted) return;
        setState(() => _realtimeConnected = true);
        ref.invalidate(messagesProvider(widget.conversationId));
      },
      onError: (_) {
        if (!mounted) return;
        setState(() => _realtimeConnected = false);
        _startFallbackPolling();
      },
    );
  }

  void _startFallbackPolling() {
    _fallbackPoll?.cancel();
    _fallbackPoll = Timer.periodic(const Duration(seconds: 8), (_) {
      ref.invalidate(messagesProvider(widget.conversationId));
    });
  }

  Future<void> _send() async {
    final t = _text.text.trim();
    if (t.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      if (_realtimeConnected) {
        await ref.read(chatRealtimeServiceProvider).sendMessage(t);
      } else {
      await ref.read(betNetApiProvider).sendMessage(widget.conversationId, t);
      }
      _text.clear();
      ref.invalidate(messagesProvider(widget.conversationId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(messagesProvider(widget.conversationId));

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          if (!_realtimeConnected)
            const Material(
              color: Color(0xFFFFF3E0),
              child: ListTile(
                dense: true,
                leading: Icon(Icons.sync_problem_outlined),
                title: Text('Realtime unavailable, using polling fallback'),
              ),
            ),
          Expanded(
            child: async.when(
              data: (msgs) {
                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  reverse: false,
                  itemCount: msgs.length,
                  itemBuilder: (_, i) {
                    final m = msgs[i];
                    final own = m.isOwn;
                    return Align(
                      alignment: own ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: own
                              ? Theme.of(context).colorScheme.primaryContainer
                              : Theme.of(context).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(m.content),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _text,
                      minLines: 1,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Type a message…',
                      ),
                      onSubmitted: (_) => _send(),
                      onChanged: (_) {
                        if (_realtimeConnected) {
                          ref.read(chatRealtimeServiceProvider).sendTyping();
                        }
                      },
                    ),
                  ),
                  FilledButton(
                    onPressed: _sending ? null : _send,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      padding: EdgeInsets.zero,
                    ),
                    child: _sending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
