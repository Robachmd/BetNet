import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key, required this.phoneE164});

  final String phoneE164;

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  final _otp = TextEditingController();
  bool _busy = false;
  bool _sending = false;
  String? _error;
  int _cooldown = 0;

  @override
  void dispose() {
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    if (widget.phoneE164.isEmpty) {
      setState(() => _error = 'Phone number missing.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(betNetApiProvider).requestOtp(widget.phoneE164);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OTP sent. Check server logs in development.')),
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

  void _tickCooldown() {
    if (_cooldown <= 0) return;
    Future<void>.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() => _cooldown = _cooldown - 1);
      if (_cooldown > 0) _tickCooldown();
    });
  }

  Future<void> _verify() async {
    final code = _otp.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).verifyOtp(
            phoneE164: widget.phoneE164,
            otp: code,
          );
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify phone')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SectionCard(
            title: 'Enter OTP',
            subtitle: widget.phoneE164.isEmpty ? null : widget.phoneE164,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _otp,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: '6-digit code',
                    counterText: '',
                  ),
                  onSubmitted: (_) => _verify(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : _verify,
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Verify'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: (_sending || _cooldown > 0) ? null : _requestOtp,
                  child: Text(_cooldown > 0 ? 'Resend in ${_cooldown}s' : 'Send OTP'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
