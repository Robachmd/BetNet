import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../services/betnet_api.dart';

class CreateBookingScreen extends ConsumerStatefulWidget {
  const CreateBookingScreen({
    super.key,
    required this.propertyId,
    required this.propertyTitle,
  });

  final int propertyId;
  final String propertyTitle;

  @override
  ConsumerState<CreateBookingScreen> createState() => _CreateBookingScreenState();
}

class _CreateBookingScreenState extends ConsumerState<CreateBookingScreen> {
  DateTime _date = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _time = const TimeOfDay(hour: 10, minute: 0);
  final _message = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (d != null) setState(() => _date = d);
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(context: context, initialTime: _time);
    if (t != null) setState(() => _time = t);
  }

  String _time24h() {
    final hh = _time.hour.toString().padLeft(2, '0');
    final mm = _time.minute.toString().padLeft(2, '0');
    return '$hh:$mm:00';
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).createVisitBooking(
            propertyId: widget.propertyId,
            visitDate: _date,
            visitTime24h: _time24h(),
            message: _message.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Visit request sent successfully.')),
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
    final dateLabel = DateFormat.yMMMd().format(_date);
    final timeLabel = _time.format(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Book visit')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(widget.propertyTitle, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            title: const Text('Visit date'),
            subtitle: Text(dateLabel),
            trailing: const Icon(Icons.calendar_today_outlined),
            onTap: _pickDate,
          ),
          const SizedBox(height: 8),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            title: const Text('Visit time'),
            subtitle: Text(timeLabel),
            trailing: const Icon(Icons.schedule),
            onTap: _pickTime,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _message,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Message (optional)',
              hintText: 'Any special note for the property owner',
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send visit request'),
          ),
        ],
      ),
    );
  }
}
