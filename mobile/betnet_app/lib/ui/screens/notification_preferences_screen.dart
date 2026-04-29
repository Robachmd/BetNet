import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends ConsumerState<NotificationPreferencesScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  Map<String, dynamic> _prefs = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _prefs = await ref.read(betNetApiProvider).fetchNotificationPreferences();
    } catch (e) {
      _error = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      _prefs = await ref.read(betNetApiProvider).updateNotificationPreferences(_prefs);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notification preferences updated.')),
      );
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
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notification preferences')),
        body: const LoadingState(),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notification preferences')),
        body: ErrorState(message: _error!, onRetry: _load),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Notification preferences')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Channels',
            child: Column(
              children: [
                _toggle('email_notifications', 'Email notifications'),
                _toggle('sms_notifications', 'SMS notifications'),
                _toggle('push_notifications', 'Push notifications'),
              ],
            ),
          ),
          SectionCard(
            title: 'Alerts',
            child: Column(
              children: [
                _toggle('new_listing_alerts', 'New listing alerts'),
                _toggle('price_drop_alerts', 'Price drop alerts'),
                _toggle('booking_updates', 'Booking updates'),
                _toggle('message_notifications', 'Message notifications'),
              ],
            ),
          ),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save preferences'),
          ),
        ],
      ),
    );
  }

  Widget _toggle(String key, String label) {
    final value = _prefs[key] == true;
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      value: value,
      onChanged: (v) => setState(() => _prefs[key] = v),
      title: Text(label),
    );
  }
}
