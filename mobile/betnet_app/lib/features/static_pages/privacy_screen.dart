import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const _body = '''
BetNet collects the information you provide (phone, profile, listings) to operate the marketplace and comply with law. We use industry-standard security and do not sell your personal data.

Location is optional and used only to show nearby listings when you allow it. Notifications can be controlled in Settings. For data requests, contact support.
''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy policy')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(BetNetSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Privacy policy',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: BetNetSpacing.md),
            Text(
              _body.trim(),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.55),
            ),
          ],
        ),
      ),
    );
  }
}
