import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../services/betnet_api.dart';

class CreateHallBookingScreen extends ConsumerStatefulWidget {
  const CreateHallBookingScreen({
    super.key,
    required this.propertyId,
    required this.propertyTitle,
  });

  final int propertyId;
  final String propertyTitle;

  @override
  ConsumerState<CreateHallBookingScreen> createState() =>
      _CreateHallBookingScreenState();
}

class _CreateHallBookingScreenState
    extends ConsumerState<CreateHallBookingScreen> {
  DateTime _date = DateTime.now().add(const Duration(days: 2));
  final _eventType = TextEditingController(text: 'Event');
  final _guests = TextEditingController(text: '100');
  final _message = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _eventType.dispose();
    _guests.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final created = await ref.read(betNetApiProvider).createHallBooking(
            propertyId: widget.propertyId,
            eventDate: _date,
            eventType: _eventType.text.trim().isEmpty
                ? 'Event'
                : _eventType.text.trim(),
            guestCount: int.tryParse(_guests.text.trim()) ?? 100,
            specialRequests: _message.text.trim(),
          );
      if (!mounted) return;
      final payAmount = double.tryParse(created.totalPrice ?? '') ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Hall booking request sent.'),
          action: payAmount > 0
              ? SnackBarAction(
                  label: 'Pay',
                  onPressed: () {
                    final title = Uri.encodeComponent(widget.propertyTitle);
                    context.push(
                      '/payment?hall_booking_id=${created.id}&amount=$payAmount&title=$title',
                    );
                  },
                )
              : null,
        ),
      );
      Navigator.pop(context, true);
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
    return Scaffold(
      appBar: AppBar(title: const Text('Book hall')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.propertyTitle, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          ListTile(
            tileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Event date'),
            subtitle: Text(DateFormat.yMMMd().format(_date)),
            trailing: const Icon(Icons.calendar_month_outlined),
            onTap: _pickDate,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _eventType,
            decoration: const InputDecoration(labelText: 'Event type'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _guests,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Guest count'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _message,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Special requests (optional)',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send hall booking request'),
          ),
        ],
      ),
    );
  }
}
