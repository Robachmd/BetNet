import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/tokens.dart';

/// Support contact form (submits via email when user taps Send).
class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _name = TextEditingController();
  final _contact = TextEditingController();
  final _message = TextEditingController();

  static const _supportEmail = 'support@betnet.et';
  static const _supportPhone = '+251911000000';

  @override
  void dispose() {
    _name.dispose();
    _contact.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final subject = Uri.encodeComponent('BetNet support: ${_name.text}');
    final body = Uri.encodeComponent(
      'From: ${_name.text}\nContact: ${_contact.text}\n\n${_message.text}',
    );
    final uri = Uri.parse('mailto:$_supportEmail?subject=$subject&body=$body');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open mail app')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contact us')),
      body: ListView(
        padding: const EdgeInsets.all(BetNetSpacing.md),
        children: [
          Text(
            'We respond within one business day.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: BetNetSpacing.lg),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: BetNetSpacing.md),
          TextField(
            controller: _contact,
            decoration: const InputDecoration(
              labelText: 'Email or phone',
            ),
          ),
          const SizedBox(height: BetNetSpacing.md),
          TextField(
            controller: _message,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'Message',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: BetNetSpacing.lg),
          FilledButton(
            onPressed: _send,
            child: const Text('Send by email'),
          ),
          const Divider(height: BetNetSpacing.xl),
          ListTile(
            leading: const Icon(Icons.email_outlined),
            title: const Text(_supportEmail),
            onTap: () => launchUrl(Uri.parse('mailto:$_supportEmail')),
          ),
          ListTile(
            leading: const Icon(Icons.phone_outlined),
            title: const Text(_supportPhone),
            onTap: () => launchUrl(Uri.parse('tel:$_supportPhone')),
          ),
          const ListTile(
            leading: Icon(Icons.location_on_outlined),
            title: Text('Addis Ababa, Ethiopia'),
          ),
        ],
      ),
    );
  }
}
