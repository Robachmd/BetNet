import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/betnet_api.dart';
import '../../utils/phone_et.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _phone = TextEditingController();
  final _pass = TextEditingController();
  final _pass2 = TextEditingController();
  final _first = TextEditingController();
  final _last = TextEditingController();
  String _role = 'RENTER';
  bool _busy = false;
  String? _error;

  String? _validatePasswordStrength(String value) {
    if (value.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    final hasUpper = RegExp(r'[A-Z]').hasMatch(value);
    final hasLower = RegExp(r'[a-z]').hasMatch(value);
    final hasDigit = RegExp(r'\d').hasMatch(value);
    if (!hasUpper || !hasLower || !hasDigit) {
      return 'Password must include uppercase, lowercase, and a number.';
    }
    return null;
  }

  String? _validateBeforeSubmit() {
    if (_first.text.trim().isEmpty) return 'First name is required.';
    if (_last.text.trim().isEmpty) return 'Last name is required.';

    final phoneError = validateEthiopianMobile(_phone.text);
    if (phoneError != null) return phoneError;

    final passwordError = _validatePasswordStrength(_pass.text);
    if (passwordError != null) return passwordError;
    if (_pass2.text.isEmpty) return 'Please confirm your password.';
    if (_pass.text != _pass2.text) return 'Passwords do not match.';

    return null;
  }

  @override
  void dispose() {
    _phone.dispose();
    _pass.dispose();
    _pass2.dispose();
    _first.dispose();
    _last.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final localError = _validateBeforeSubmit();
    if (localError != null) {
      setState(() => _error = localError);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final phone = normalizeEthiopianPhone(_phone.text);
      await ref.read(authControllerProvider.notifier).register(
            phoneE164: phone,
            password: _pass.text,
            passwordConfirm: _pass2.text,
            firstName: _first.text.trim(),
            lastName: _last.text.trim(),
            role: _role,
          );
      if (!mounted) return;
      final from = GoRouterState.of(context).uri.queryParameters['from'];
      if (from != null && from.isNotEmpty) {
        context.go(Uri.decodeComponent(from));
      } else {
        context.go('/');
      }
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign up')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile',
                  hintText: '09..., 07..., or +251...',
                  helperText: 'Ethio Telecom and Safaricom numbers are supported.',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _first,
                decoration: const InputDecoration(labelText: 'First name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _last,
                decoration: const InputDecoration(labelText: 'Last name'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _role,
                decoration: const InputDecoration(labelText: 'I am a'),
                items: const [
                  DropdownMenuItem(value: 'RENTER', child: Text('Renter')),
                  DropdownMenuItem(value: 'LANDLORD', child: Text('Property Owner')),
                ],
                onChanged: (v) => setState(() => _role = v ?? 'RENTER'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pass,
                obscureText: true,
                decoration:
                    const InputDecoration(
                      labelText: 'Password',
                      helperText: 'Use 8+ chars with uppercase, lowercase, and number.',
                    ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pass2,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm password'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Register'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
