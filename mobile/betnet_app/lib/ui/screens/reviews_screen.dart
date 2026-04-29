import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/review.dart';
import '../../services/betnet_api.dart';

class ReviewsScreen extends ConsumerWidget {
  const ReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_myReviewsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My reviews')),
      body: async.when(
        data: (rows) {
          if (rows.isEmpty) return const Center(child: Text('No reviews yet.'));
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_myReviewsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: rows.length,
              itemBuilder: (_, i) {
                final r = rows[i];
                return Card(
                  child: ListTile(
                    title: Text('${'★' * r.rating} ${r.title}'),
                    subtitle: Text(
                      '${r.comment}\n${DateFormat.yMMMd().format(r.createdAt)}',
                    ),
                    isThreeLine: true,
                  ),
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

class PropertyReviewsScreen extends ConsumerStatefulWidget {
  const PropertyReviewsScreen({
    super.key,
    required this.propertyId,
    required this.propertyTitle,
  });

  final int propertyId;
  final String propertyTitle;

  @override
  ConsumerState<PropertyReviewsScreen> createState() => _PropertyReviewsScreenState();
}

class _PropertyReviewsScreenState extends ConsumerState<PropertyReviewsScreen> {
  final _title = TextEditingController();
  final _comment = TextEditingController();
  int _rating = 5;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await ref.read(betNetApiProvider).createReview(
            reviewType: 'PROPERTY_REVIEW',
            propertyId: widget.propertyId,
            rating: _rating,
            title: _title.text.trim(),
            comment: _comment.text.trim(),
          );
      _title.clear();
      _comment.clear();
      ref.invalidate(_propertyReviewsProvider(widget.propertyId));
      ref.invalidate(_myReviewsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Review submitted for moderation.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_propertyReviewsProvider(widget.propertyId));
    return Scaffold(
      appBar: AppBar(title: Text('Reviews · ${widget.propertyTitle}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Write a review', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          DropdownButtonFormField<int>(
            initialValue: _rating,
            decoration: const InputDecoration(labelText: 'Rating'),
            items: [5, 4, 3, 2, 1]
                .map((r) => DropdownMenuItem(value: r, child: Text('$r stars')))
                .toList(),
            onChanged: (v) => setState(() => _rating = v ?? _rating),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _title,
            decoration: const InputDecoration(labelText: 'Title'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _comment,
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Comment'),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _saving ? null : _submit,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Submit review'),
          ),
          const SizedBox(height: 16),
          async.when(
            data: (rows) {
              if (rows.isEmpty) {
                return const Card(child: ListTile(title: Text('No reviews yet.')));
              }
              return Column(
                children: rows.map((r) {
                  return Card(
                    child: ListTile(
                      title: Text('${'★' * r.rating} ${r.title}'),
                      subtitle: Text(r.comment),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e'),
          ),
        ],
      ),
    );
  }
}

final _myReviewsProvider = FutureProvider.autoDispose<List<ReviewItem>>((ref) async {
  return ref.watch(betNetApiProvider).fetchMyReviews();
});

final _propertyReviewsProvider =
    FutureProvider.autoDispose.family<List<ReviewItem>, int>((ref, propertyId) async {
  return ref.watch(betNetApiProvider).fetchPropertyReviews(propertyId);
});
