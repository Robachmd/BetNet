import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../data/models/booking.dart';
import '../../data/models/hall_booking.dart';
import '../../providers/bookings_provider.dart';
import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  bool _busy = false;

  Future<void> _cancelHall(HallBookingItem b) async {
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).cancelHallBooking(b.id);
      ref.invalidate(_hallBookingsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel(BookingItem b) async {
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).cancelBooking(b.id);
      ref.invalidate(renterBookingsProvider);
      ref.invalidate(ownerBookingsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _updateStatus(BookingItem b, String status) async {
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).updateBookingStatus(
            bookingId: b.id,
            status: status,
          );
      ref.invalidate(renterBookingsProvider);
      ref.invalidate(ownerBookingsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final isOwner = auth.user?.isPropertyOwner ?? false;
    final renterBookingsAsync = ref.watch(renterBookingsProvider);
    final ownerBookingsAsync = ref.watch(ownerBookingsProvider);
    final hallBookingsAsync = ref.watch(_hallBookingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Bookings')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(renterBookingsProvider);
          ref.invalidate(ownerBookingsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SectionCard(
              title: 'My bookings',
              child: renterBookingsAsync.when(
                data: (items) {
                  if (items.isEmpty) {
                    return const EmptyState(title: 'No bookings yet.');
                  }
                  final now = DateTime.now();
                  final upcoming = items
                      .where((b) => !b.visitDate.isBefore(DateTime(now.year, now.month, now.day)))
                      .toList();
                  final past = items.where((b) => !upcoming.contains(b)).toList();
                  return Column(
                    children: [
                      ...upcoming.map((b) => _BookingTile(
                            booking: b,
                            trailing: b.canCancel
                                ? TextButton(
                                    onPressed: _busy ? null : () => _cancel(b),
                                    child: const Text('Cancel'),
                                  )
                                : null,
                          )),
                      if (past.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Past',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        ...past.map((b) => _BookingTile(booking: b)),
                      ],
                    ],
                  );
                },
                loading: () => const LoadingState(),
                error: (e, _) => ErrorState(message: '$e'),
              ),
            ),
            if (isOwner) ...[
              const SizedBox(height: 24),
              SectionCard(
                title: 'Incoming requests',
                child: ownerBookingsAsync.when(
                  data: (items) {
                    if (items.isEmpty) {
                      return const EmptyState(title: 'No incoming requests.');
                    }
                    return Column(
                      children: items.map((b) {
                        return _BookingTile(
                          booking: b,
                          subtitleSuffix:
                              b.renterName?.isNotEmpty == true ? ' · ${b.renterName}' : null,
                          trailing: b.status == 'PENDING'
                              ? Wrap(
                                  spacing: 4,
                                  children: [
                                    TextButton(
                                      onPressed: _busy
                                          ? null
                                          : () => _updateStatus(b, 'REJECTED'),
                                      child: const Text('Reject'),
                                    ),
                                    FilledButton.tonal(
                                      onPressed: _busy
                                          ? null
                                          : () => _updateStatus(b, 'CONFIRMED'),
                                      child: const Text('Confirm'),
                                    ),
                                  ],
                                )
                              : null,
                        );
                      }).toList(),
                    );
                  },
                  loading: () => const LoadingState(),
                  error: (e, _) => ErrorState(message: '$e'),
                ),
              ),
            ],
            const SizedBox(height: 24),
            SectionCard(
              title: 'Hall bookings',
              child: hallBookingsAsync.when(
                data: (items) {
                  if (items.isEmpty) {
                    return const EmptyState(title: 'No hall bookings yet.');
                  }
                  return Column(
                    children: items.map((b) {
                      return Card(
                        child: ListTile(
                          title: Text(b.propertyTitle),
                          subtitle: Text(
                            '${DateFormat.yMMMd().format(b.eventDate)}'
                            '${b.eventType == null ? '' : ' · ${b.eventType}'}'
                            '${b.totalPrice == null ? '' : ' · ETB ${b.totalPrice}'}',
                          ),
                          trailing: b.status == 'PENDING'
                              ? TextButton(
                                  onPressed: _busy ? null : () => _cancelHall(b),
                                  child: const Text('Cancel'),
                                )
                              : StatusBadge(
                                  label: b.statusDisplay,
                                  tone: b.status == 'CONFIRMED'
                                      ? StatusTone.success
                                      : b.status == 'PENDING'
                                          ? StatusTone.warning
                                          : StatusTone.neutral,
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
      ),
    );
  }
}

final _hallBookingsProvider = FutureProvider.autoDispose<List<HallBookingItem>>((ref) async {
  return ref.watch(betNetApiProvider).fetchHallBookings();
});

class _BookingTile extends StatelessWidget {
  const _BookingTile({
    required this.booking,
    this.trailing,
    this.subtitleSuffix,
  });

  final BookingItem booking;
  final Widget? trailing;
  final String? subtitleSuffix;

  @override
  Widget build(BuildContext context) {
    final date = DateFormat.yMMMd().format(booking.visitDate);
    final subtitleBase = '$date ${booking.visitTime ?? ''} · ${booking.statusDisplay}';
    final subtitle = subtitleSuffix == null
        ? subtitleBase
        : '$subtitleBase$subtitleSuffix';
    return Card(
      child: ListTile(
        title: Text(booking.propertyTitle),
        subtitle: Row(
          children: [
            Expanded(child: Text(subtitle.trim())),
            const SizedBox(width: 6),
            StatusBadge(
              label: booking.statusDisplay,
              tone: booking.status == 'CONFIRMED'
                  ? StatusTone.success
                  : booking.status == 'PENDING'
                      ? StatusTone.warning
                      : booking.status == 'CANCELLED'
                          ? StatusTone.error
                          : StatusTone.neutral,
            ),
          ],
        ),
        trailing: trailing,
        onTap: booking.propertySlug.isEmpty
            ? null
            : () => context.push('/property/${booking.propertySlug}'),
      ),
    );
  }
}
