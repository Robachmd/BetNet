import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../core/theme/tokens.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  PackageInfo? _info;

  @override
  void initState() {
    super.initState();
    PackageInfo.fromPlatform().then((i) {
      if (mounted) setState(() => _info = i);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('About BetNet')),
      body: ListView(
        padding: const EdgeInsets.all(BetNetSpacing.lg),
        children: [
          Text(
            'BetNet',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: BetNetSpacing.sm),
          Text(
            'Ethiopia’s marketplace for rentals, sales, and event spaces. '
            'Verified listings, real-time chat, and payments built for local landlords and renters.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
          ),
          const SizedBox(height: BetNetSpacing.lg),
          Text(
            'Mission',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: BetNetSpacing.sm),
          const Text(
            'Make finding and listing property safer and simpler with transparent pricing, '
            'multi-language support, and tools that property owners trust.',
          ),
          const SizedBox(height: BetNetSpacing.xl),
          if (_info != null)
            Text(
              'Version ${_info!.version} (${_info!.buildNumber})',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
        ],
      ),
    );
  }
}
