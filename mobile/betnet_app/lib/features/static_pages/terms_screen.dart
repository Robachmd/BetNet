import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  static const _body = '''
By using BetNet you agree to use the platform lawfully and honestly. Listings must describe real, available properties. Payments processed through BetNet partners are subject to their terms.

We may update these terms; continued use means you accept the latest version. Contact support for account or listing disputes.
''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & conditions')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(BetNetSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Terms & conditions',
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
