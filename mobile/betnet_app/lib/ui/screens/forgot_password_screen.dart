import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/betnet_api.dart';
import '../../utils/phone_et.dart';

/// Phone + OTP + new password (backend matches [BetNetApi.requestPasswordResetOtp] / [BetNetApi.confirmPasswordReset]).
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _pass = TextEditingController();
  final _pass2 = TextEditingController();

  int _step = 0;
  String? _phoneE164;
  bool _busy = false;
  bool _sending = false;
  String? _error;
  int _cooldown = 0;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    _pass.dispose();
    _pass2.dispose();
    super.dispose();
  }

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

  void _tickCooldown() {
    if (_cooldown <= 0) return;
    Future<void>.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() => _cooldown = _cooldown - 1);
      if (_cooldown > 0) _tickCooldown();
    });
  }

  Future<void> _sendCode() async {
    final phoneError = validateEthiopianMobile(_phone.text);
    if (phoneError != null) {
      setState(() => _error = phoneError);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final phone = normalizeEthiopianPhone(_phone.text);
      await ref.read(betNetApiProvider).requestPasswordResetOtp(phone);
      if (!mounted) return;
      setState(() {
        _phoneE164 = phone;
        _step = 1;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'If this number is registered, a code was sent. In development, check server logs.',
          ),
        ),
      );
      setState(() => _cooldown = 60);
      _tickCooldown();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resendCode() async {
    if (_phoneE164 == null || _phoneE164!.isEmpty) return;
    if (_cooldown > 0 || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(betNetApiProvider).requestPasswordResetOtp(_phoneE164!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Code sent again. In development, check server logs.',
            ),
          ),
        );
        setState(() => _cooldown = 60);
        _tickCooldown();
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _submitNewPassword() async {
    final code = _otp.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    final p = _pass.text;
    final strength = _validatePasswordStrength(p);
    if (strength != null) {
      setState(() => _error = strength);
      return;
    }
    if (_pass2.text.isEmpty) {
      setState(() => _error = 'Please confirm your password.');
      return;
    }
    if (p != _pass2.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    if (_phoneE164 == null) {
      setState(() => _error = 'Start over and send a code first.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).completePasswordReset(
            phoneE164: _phoneE164!,
            otp: code,
            newPassword: p,
            newPasswordConfirm: _pass2.text,
          );
      if (!mounted) return;
      final from = GoRouterState.of(context).uri.queryParameters['from'];
      if (from != null && from.isNotEmpty) {
        context.go(Uri.decodeComponent(from));
      } else {
        context.go('/');
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Forgot password'),
        leading: _step == 1
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() {
                  _step = 0;
                  _error = null;
                }),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_step == 0) ...[
                Text(
                  'Enter the mobile number for your account. We will send a verification code.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Mobile number',
                    hintText: '+251911234567 or 0911234567',
                  ),
                ),
              ] else ...[
                Text(
                  'Enter the code and choose a new password.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                if (_phoneE164 != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _phoneE164!,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ],
                const SizedBox(height: 16),
                TextField(
                  controller: _otp,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  decoration: const InputDecoration(
                    labelText: '6-digit code',
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: (_sending || _cooldown > 0) ? null : _resendCode,
                  child: Text(
                    _cooldown > 0
                        ? 'Resend code in ${_cooldown}s'
                        : 'Resend code',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _pass,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New password',
                    helperText:
                        'Use 8+ chars with uppercase, lowercase, and number.',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _pass2,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm new password',
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy
                    ? null
                    : (_step == 0 ? _sendCode : _submitNewPassword),
                child: _busy
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_step == 0 ? 'Send code' : 'Reset password'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
