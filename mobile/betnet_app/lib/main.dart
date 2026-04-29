import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'core/app_debug.dart';
import 'core/config.dart';

/// BetNet entrypoint. Initializes Hive for offline listing cache.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  try {
    await Hive.openBox(AppConfig.hiveBoxName);
  } catch (e, st) {
    AppDebug.log('Hive.openBox failed, retrying after delete: $e\n$st');
    try {
      await Hive.deleteBoxFromDisk(AppConfig.hiveBoxName);
      await Hive.openBox(AppConfig.hiveBoxName);
    } catch (e2, st2) {
      debugPrint('Hive recovery failed: $e2\n$st2');
    }
  }
  await AppConfig.loadApiBaseOverride();
  runApp(const ProviderScope(child: BetNetApp()));
}
