import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/betnet_api.dart';
import '../../utils/external_checkout.dart';
import '../widgets/app_primitives.dart';

/// Unified payment flow (hall booking, featured, etc.) aligned with web PaymentPage.
class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({
    super.key,
    this.bookingId,
    this.amount,
    this.title,
    this.hallBookingId,
    this.txRef,
  });

  final String? bookingId;
  final double? amount;
  final String? title;
  final int? hallBookingId;
  final String? txRef;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _method = 'CHAPA';
  bool _busy = false;
  String? _status;
  String? _lastTx;
  String? _error;

  @override
  void initState() {
    super.initState();
    final pre = widget.txRef;
    if (pre != null && pre.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _verify(pre));
    }
  }

  Future<void> _verify(String tx) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final out = await ref.read(betNetApiProvider).verifyPayment(
            transactionId: tx,
            paymentMethod: _method,
          );
      final st = '${out['status'] ?? out['detail'] ?? 'ok'}';
      setState(() => _status = st);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pay() async {
    final amt = widget.amount;
    if (amt == null || amt <= 0) {
      setState(() => _error = 'Amount required');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final paymentType = widget.hallBookingId != null ? 'HALL_BOOKING' : 'LISTING_FEE';
      final result = await ref.read(betNetApiProvider).initiatePayment(
            paymentType: paymentType,
            amount: amt,
            paymentMethod: _method,
            hallBookingId: widget.hallBookingId,
            description: widget.title ?? 'BetNet payment',
          );
      _lastTx = result['transaction_id']?.toString();
      final url = result['checkout_url']?.toString();
      if (url != null && url.isNotEmpty) {
        await openPaymentCheckoutUrl(url);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Complete payment in the browser, then tap Verify.')),
          );
        }
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
      appBar: AppBar(
        title: const Text('Payment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: widget.title ?? 'Checkout',
            subtitle: widget.amount != null ? 'ETB ${widget.amount}' : null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  key: ValueKey<String>(_method),
                  initialValue: _method,
                  decoration: const InputDecoration(labelText: 'Method'),
                  items: const [
                    DropdownMenuItem(value: 'CHAPA', child: Text('Chapa')),
                    DropdownMenuItem(value: 'TELEBIRR', child: Text('Telebirr')),
                    DropdownMenuItem(value: 'STRIPE', child: Text('Stripe')),
                    DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Bank transfer')),
                  ],
                  onChanged: _busy
                      ? null
                      : (v) {
                          if (v != null) setState(() => _method = v);
                        },
                ),
                const SizedBox(height: 12),
                if (_error != null)
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                if (_status != null) StatusBadge(label: _status!, tone: StatusTone.success),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _busy ? null : _pay,
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Pay now'),
                ),
                if (_lastTx != null) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _verify(_lastTx!),
                    child: const Text('Verify status'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
