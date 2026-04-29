import 'package:betnet_app/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('BetNetApp mounts MaterialApp', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: BetNetApp(),
      ),
    );
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
