import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../providers/home_feed_provider.dart';
import '../../services/betnet_api.dart';

class DebugBackendSettingsScreen extends ConsumerStatefulWidget {
  const DebugBackendSettingsScreen({super.key});

  @override
  ConsumerState<DebugBackendSettingsScreen> createState() =>
      _DebugBackendSettingsScreenState();
}

class _DebugBackendSettingsScreenState
    extends ConsumerState<DebugBackendSettingsScreen> {
  late final TextEditingController _controller;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final initial =
        AppConfig.debugApiBaseOverride ??
        ref.read(authControllerProvider.notifier).api.baseUrl;
    _controller = TextEditingController(text: initial);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _validateUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'Backend URL is required.';
    final uri = Uri.tryParse(trimmed);
    if (uri == null || !uri.isAbsolute) {
      return 'Enter a full URL like http://192.168.1.100:8000';
    }
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      return 'URL must start with http:// or https://';
    }
    if (uri.host.isEmpty) {
      return 'URL host is missing.';
    }
    return null;
  }

  Future<void> _save() async {
    final url = _controller.text.trim();
    final validationError = _validateUrl(url);
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).setApiBaseUrlOverride(url);
      ref.invalidate(featuredPropertiesProvider);
      ref.invalidate(newestPropertiesProvider);
      ref.invalidate(nearbyPropertiesProvider);
      ref.invalidate(deviceLocationProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backend URL saved for this device.')),
      );
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reset() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).clearApiBaseUrlOverride();
      ref.invalidate(featuredPropertiesProvider);
      ref.invalidate(newestPropertiesProvider);
      ref.invalidate(nearbyPropertiesProvider);
      ref.invalidate(deviceLocationProvider);
      if (!mounted) return;
      _controller.text = AppConfig.apiBaseUrl;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Using default backend URL again.')),
      );
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveUrl = ref.read(authControllerProvider.notifier).api.baseUrl;
    return Scaffold(
      appBar: AppBar(title: const Text('Debug Backend URL')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Change API server address for this phone without rebuilding.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          Text(
            'Current effective URL: $effectiveUrl',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'Backend URL',
              hintText: 'http://192.168.1.100:8000',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Examples: http://192.168.1.100:8000 or https://api.example.com',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save URL'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _saving ? null : _reset,
            child: const Text('Reset to default'),
          ),
        ],
      ),
    );
  }
}
