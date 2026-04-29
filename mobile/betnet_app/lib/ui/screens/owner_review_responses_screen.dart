import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/property.dart';
import '../../data/models/review.dart';
import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

final _ownerListingsProvider = FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  return ref.watch(betNetApiProvider).fetchMyProperties();
});

class OwnerReviewResponsesScreen extends ConsumerStatefulWidget {
  const OwnerReviewResponsesScreen({super.key});

  @override
  ConsumerState<OwnerReviewResponsesScreen> createState() =>
      _OwnerReviewResponsesScreenState();
}

class _OwnerReviewResponsesScreenState
    extends ConsumerState<OwnerReviewResponsesScreen> {
  int? _selectedPropertyId;
  String? _selectedPropertyTitle;
  bool _saving = false;
  final Map<int, TextEditingController> _controllers = {};

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _controllerFor(int reviewId) {
    return _controllers.putIfAbsent(reviewId, () => TextEditingController());
  }

  Future<void> _respond(int reviewId) async {
    final text = _controllerFor(reviewId).text.trim();
    if (text.isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(betNetApiProvider).respondToReview(reviewId: reviewId, comment: text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Response sent.')),
      );
      _controllerFor(reviewId).clear();
      if (_selectedPropertyId != null) {
        ref.invalidate(_propertyReviewsProvider(_selectedPropertyId!));
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
    final listingsAsync = ref.watch(_ownerListingsProvider);
    final reviewsAsync = _selectedPropertyId == null
        ? const AsyncValue<List<ReviewItem>>.data([])
        : ref.watch(_propertyReviewsProvider(_selectedPropertyId!));

    return Scaffold(
      appBar: AppBar(title: const Text('Owner review responses')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Select listing',
            child: listingsAsync.when(
              data: (listings) {
                if (listings.isEmpty) {
                  return const EmptyState(title: 'No listings found.');
                }
                return DropdownButtonFormField<int>(
                  initialValue: _selectedPropertyId,
                  items: listings
                      .map((p) => DropdownMenuItem(
                            value: p.id,
                            child: Text(p.title),
                          ))
                      .toList(),
                  onChanged: (v) {
                    setState(() {
                      _selectedPropertyId = v;
                      _selectedPropertyTitle =
                          listings.firstWhere((p) => p.id == v).title;
                    });
                  },
                  decoration: const InputDecoration(labelText: 'Listing'),
                );
              },
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
          SectionCard(
            title: _selectedPropertyTitle == null
                ? 'Reviews'
                : 'Reviews · $_selectedPropertyTitle',
            child: reviewsAsync.when(
              data: (rows) {
                if (_selectedPropertyId == null) {
                  return const EmptyState(title: 'Choose a listing to see reviews.');
                }
                if (rows.isEmpty) {
                  return const EmptyState(title: 'No reviews for this listing.');
                }
                return Column(
                  children: rows.map((r) {
                    final hasResponse = r.responseComment != null &&
                        r.responseComment!.trim().isNotEmpty;
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${'★' * r.rating} ${r.title}'),
                            const SizedBox(height: 4),
                            Text(r.comment),
                            const SizedBox(height: 6),
                            if (hasResponse)
                              const StatusBadge(
                                label: 'Already responded',
                                tone: StatusTone.success,
                              )
                            else ...[
                              TextField(
                                controller: _controllerFor(r.id),
                                minLines: 1,
                                maxLines: 3,
                                decoration: const InputDecoration(
                                  labelText: 'Write response',
                                ),
                              ),
                              const SizedBox(height: 6),
                              FilledButton.tonal(
                                onPressed: _saving ? null : () => _respond(r.id),
                                child: const Text('Send response'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
        ],
      ),
    );
  }
}

final _propertyReviewsProvider =
    FutureProvider.autoDispose.family<List<ReviewItem>, int>((ref, propertyId) async {
  return ref.watch(betNetApiProvider).fetchPropertyReviews(propertyId);
});
