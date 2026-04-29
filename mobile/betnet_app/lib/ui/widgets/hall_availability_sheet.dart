import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../services/betnet_api.dart';

/// Month calendar for a hall property (parity with web BookingCalendar).
Future<void> showHallAvailabilitySheet(
  BuildContext context,
  WidgetRef ref, {
  required int propertyId,
  required String title,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
      child: _HallAvailabilityPanel(
        propertyId: propertyId,
        title: title,
      ),
    ),
  );
}

class _HallAvailabilityPanel extends ConsumerStatefulWidget {
  const _HallAvailabilityPanel({
    required this.propertyId,
    required this.title,
  });

  final int propertyId;
  final String title;

  @override
  ConsumerState<_HallAvailabilityPanel> createState() => _HallAvailabilityPanelState();
}

class _HallAvailabilityPanelState extends ConsumerState<_HallAvailabilityPanel> {
  late int _year;
  late int _month;

  @override
  void initState() {
    super.initState();
    final n = DateTime.now();
    _year = n.year;
    _month = n.month;
  }

  void _prev() {
    if (_month == 1) {
      setState(() {
        _month = 12;
        _year--;
      });
    } else {
      setState(() => _month--);
    }
  }

  void _next() {
    if (_month == 12) {
      setState(() {
        _month = 1;
        _year++;
      });
    } else {
      setState(() => _month++);
    }
  }

  Color _colorFor(String status, ColorScheme cs) {
    switch (status) {
      case 'available':
        return cs.primaryContainer;
      case 'booked':
        return cs.errorContainer;
      case 'unavailable':
        return cs.tertiaryContainer;
      case 'has_visits':
        return cs.secondaryContainer;
      case 'past':
      default:
        return cs.surfaceContainerHighest.withValues(alpha: 0.5);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final header = DateFormat.yMMMM().format(DateTime(_year, _month));

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.52,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Text(
                widget.title,
                style: Theme.of(context).textTheme.titleMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: _prev,
                  icon: const Icon(Icons.chevron_left),
                  tooltip: 'Previous month',
                ),
                Text(header, style: Theme.of(context).textTheme.titleSmall),
                IconButton(
                  onPressed: _next,
                  icon: const Icon(Icons.chevron_right),
                  tooltip: 'Next month',
                ),
              ],
            ),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                key: ValueKey<String>('${widget.propertyId}_$_year-$_month'),
                future: ref.read(betNetApiProvider).fetchAvailability(
                      propertyId: widget.propertyId,
                      year: _year,
                      month: _month,
                    ),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snap.hasError) {
                    return Center(child: Text('${snap.error}'));
                  }
                  final raw = snap.data?['dates'];
                  if (raw is! List) {
                    return const Center(child: Text('No calendar data'));
                  }
                  final days = raw
                      .map((e) => Map<String, dynamic>.from(e as Map))
                      .toList();
                  return GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 7,
                      mainAxisSpacing: 4,
                      crossAxisSpacing: 4,
                      childAspectRatio: 1.1,
                    ),
                    itemCount: days.length,
                    itemBuilder: (_, i) {
                      final d = days[i];
                      final dateStr = '${d['date'] ?? ''}';
                      final status = '${d['status'] ?? ''}';
                      final dayNum = dateStr.length >= 10 ? dateStr.substring(8, 10) : '?';
                      return Tooltip(
                        message: '$dateStr · $status',
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: _colorFor(status, cs),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              dayNum,
                              style: Theme.of(context).textTheme.labelMedium,
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  _LegendDot(color: cs.primaryContainer, label: 'Open'),
                  _LegendDot(color: cs.errorContainer, label: 'Booked'),
                  _LegendDot(color: cs.tertiaryContainer, label: 'Blocked'),
                  _LegendDot(color: cs.secondaryContainer, label: 'Visits'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3)),
        ),
        const SizedBox(width: 4),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
